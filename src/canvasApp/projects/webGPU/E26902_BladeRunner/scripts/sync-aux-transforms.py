"""Selective static mesh transforms, without re-exporting geometry.

Run in Blender background with --disable-autoexec --python-exit-code 1.
After --, pass --objects NAME [NAME ...]; add --apply to write the GLB.
Default is a dry run. Requires matching local vertices/origins; rejects
unsupported hierarchies and animated objects rather than guessing a mapping.
"""
import argparse
import copy
import hashlib
import json
import math
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Matrix, Vector, Quaternion

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[4]
ROOT = REPO.parents[1]
C = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))

def read_glb(raw):
    magic, version, length = struct.unpack_from('<III', raw)
    assert (magic, version, length) == (0x46546C67, 2, len(raw))
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4E4F534A
    return json.loads(raw[20:20 + size]), raw[20 + size:]

def local_vertices(obj):
    return sorted(set(tuple(round(float(x), 6) for x in v.co) for v in obj.data.vertices))

def matrix(node):
    if 'matrix' in node:
        return Matrix([node['matrix'][k::4] for k in range(4)])
    q = node.get('rotation', [0, 0, 0, 1])
    return Matrix.LocRotScale(Vector(node.get('translation', [0, 0, 0])),
        Quaternion((q[3], *q[:3])), Vector(node.get('scale', [1, 1, 1])))

def error(a, b):
    return max(abs(a[r][c] - b[r][c]) for r in range(4) for c in range(4))

def sha(data):
    return hashlib.sha256(data).hexdigest()

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--objects', nargs='+', required=True)
parser.add_argument('--source', type=Path, default=ROOT / '_Blender/20260914_BladeRunner_AUXILIAR.blend')
parser.add_argument('--target', type=Path, default=REPO / 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
parser.add_argument('--apply', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert len(args.objects) == len(set(args.objects)), 'Duplicate selection'
source_hash = sha(args.source.read_bytes())
raw = args.target.read_bytes()
doc, tail = read_glb(raw)
updated = copy.deepcopy(doc)
indices = {}
for name in args.objects:
    matches = [i for i, n in enumerate(doc['nodes']) if n.get('name') == name]
    assert len(matches) == 1, f'Expected one GLB node: {name}'
    i = matches[0]
    node = doc['nodes'][i]
    assert 'mesh' in node and 'skin' not in node and not node.get('children'), f'Unsupported node: {name}'
    assert i in doc['scenes'][doc.get('scene', 0)]['nodes'], f'Non-root GLB node: {name}'
    assert not any(i in n.get('children', []) for n in doc['nodes']), f'Parented GLB node: {name}'
    assert not any(ch['target'].get('node') == i for a in doc.get('animations', []) for ch in a['channels']), f'Animated GLB node: {name}'
    indices[name] = i

bpy.ops.wm.open_mainfile(filepath=str(args.source), load_ui=False)
source = {}
for name in args.objects:
    obj = bpy.data.objects.get(name)
    assert obj is not None and obj.type == 'MESH', f'Missing mesh object: {name}'
    assert obj.parent is None and not obj.modifiers and not obj.constraints and not obj.animation_data and not obj.data.shape_keys, f'Unsupported Blender object: {name}'
    source[name] = {'matrix': obj.matrix_world.copy(), 'vertices': local_vertices(obj)}

# Import the current asset only for validation, never export it through Blender.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.target), merge_vertices=False)
changes = []
for name, index in indices.items():
    obj = bpy.data.objects.get(name)
    assert obj is not None and local_vertices(obj) == source[name]['vertices'], f'Local geometry/origin mismatch: {name}; requires a calibrated mapping'
    old_world = C @ obj.matrix_world @ C.inverted()
    assert error(old_world, matrix(doc['nodes'][index])) < 1e-5, f'Unexpected import transform: {name}'
    desired = C @ source[name]['matrix'] @ C.inverted()
    position, rotation, scale = desired.decompose()
    assert all(math.isfinite(x) for row in desired for x in row)
    assert min(scale) > 0, 'Only positive scales supported'
    assert error(desired, Matrix.LocRotScale(position, rotation, scale)) < 1e-5, 'Shear unsupported'
    node = updated['nodes'][index]
    before = {k: node[k] for k in ('matrix', 'translation', 'rotation', 'scale') if k in node}
    if error(desired, matrix(node)) > 1e-6:
        node.pop('matrix', None)
        node['translation'] = list(position)
        node['rotation'] = [rotation.x, rotation.y, rotation.z, rotation.w]
        node['scale'] = list(scale)
    changes.append({'name': name, 'node': index, 'before': before,
        'after': {k: node[k] for k in ('matrix', 'translation', 'rotation', 'scale') if k in node},
        'blender_position': list(source[name]['matrix'].translation),
        'blender_rotation_z_degrees': math.degrees(source[name]['matrix'].to_euler('XYZ').z)})

encoded = json.dumps(updated, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
candidate = struct.pack('<III', 0x46546C67, 2, 20 + len(encoded) + len(tail)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + tail
if updated == doc:
    candidate = raw  # Idempotent: preserve even JSON formatting on repeated runs.
check, check_tail = read_glb(candidate)
assert check_tail == tail, 'Binary chunks changed'
control = copy.deepcopy(check)
for index in indices.values():
    for key in ('matrix', 'translation', 'rotation', 'scale'):
        control['nodes'][index].pop(key, None)
        if key in doc['nodes'][index]:
            control['nodes'][index][key] = doc['nodes'][index][key]
assert control == doc, 'Unexpected non-transform change'
assert sha(args.source.read_bytes()) == source_hash
assert args.target.read_bytes() == raw, 'GLB changed while processing'

stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
out = PROJECT / 'docs/transform-sync'
out.mkdir(parents=True, exist_ok=True)
report = {'source': str(args.source), 'sourceSha256': source_hash, 'target': str(args.target),
    'applied': args.apply, 'changed': updated != doc, 'beforeSha256': sha(raw), 'afterSha256': sha(candidate),
    'beforeBytes': len(raw), 'afterBytes': len(candidate), 'binaryChunksUnchanged': True,
    'onlySelectedNodeTransformsChanged': True, 'changes': changes}
if args.apply and updated != doc:
    backups = ROOT / '_Blender/transform_sync/backups'
    backups.mkdir(parents=True, exist_ok=True)
    backup = backups / (stamp + '_' + args.target.name)
    with backup.open('xb') as f:
        f.write(raw)
    report['backup'] = str(backup)
    temp = args.target.with_suffix('.sync-tmp')
    with temp.open('xb') as f:
        f.write(candidate)
    temp.replace(args.target)
    assert args.target.read_bytes() == candidate
report_path = out / (stamp + ('-applied' if args.apply else '-preview') + '.json')
report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print('TRANSFORM_SYNC', json.dumps(report, ensure_ascii=False))
