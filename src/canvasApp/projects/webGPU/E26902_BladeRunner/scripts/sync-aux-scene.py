"""Synchronize selected transforms and explicit removals from the auxiliary Blend.

The GLB is edited directly: Blender only supplies object transforms. Missing
objects on either side are skipped and reported. Removed
nodes and their now-unused meshes/accessors/buffer views are pruned and the BIN
chunk is compacted. Materials, textures and images are pruned only when unused.
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
from mathutils import Matrix, Quaternion, Vector

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[4]
ROOT = REPO.parents[1]
C = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read_glb(raw):
    magic, version, total = struct.unpack_from('<III', raw)
    assert (magic, version, total) == (0x46546C67, 2, len(raw))
    json_size, json_type = struct.unpack_from('<II', raw, 12)
    assert json_type == 0x4E4F534A
    doc = json.loads(raw[20:20 + json_size])
    bin_header = 20 + json_size
    bin_size, bin_type = struct.unpack_from('<II', raw, bin_header)
    assert bin_type == 0x004E4942 and bin_header + 8 + bin_size == len(raw)
    return doc, raw[bin_header + 8:]

def write_glb(doc, binary):
    encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return (struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(binary))
        + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
        + struct.pack('<II', len(binary), 0x004E4942) + binary)

def node_matrix(node):
    if 'matrix' in node:
        return Matrix([node['matrix'][k::4] for k in range(4)])
    q = node.get('rotation', [0, 0, 0, 1])
    return Matrix.LocRotScale(Vector(node.get('translation', [0, 0, 0])),
        Quaternion((q[3], *q[:3])), Vector(node.get('scale', [1, 1, 1])))

def matrix_error(a, b):
    return max(abs(a[r][c] - b[r][c]) for r in range(4) for c in range(4))

def subset(items, used):
    order = sorted(used)
    remap = {old: new for new, old in enumerate(order)}
    return [copy.deepcopy(items[i]) for i in order], remap

def texture_indices(value, result=None):
    result = result if result is not None else set()
    if isinstance(value, dict):
        for key, child in value.items():
            if key.endswith('Texture') and isinstance(child, dict) and isinstance(child.get('index'), int):
                result.add(child['index'])
            texture_indices(child, result)
    elif isinstance(value, list):
        for child in value:
            texture_indices(child, result)
    return result

def remap_texture_indices(value, remap):
    if isinstance(value, dict):
        for key, child in value.items():
            if key.endswith('Texture') and isinstance(child, dict) and isinstance(child.get('index'), int):
                child['index'] = remap[child['index']]
            remap_texture_indices(child, remap)
    elif isinstance(value, list):
        for child in value:
            remap_texture_indices(child, remap)

def stats(doc, binary_size):
    return {key: len(doc.get(key, [])) for key in
        ('nodes', 'meshes', 'materials', 'textures', 'images', 'samplers', 'accessors', 'bufferViews')} | {'binaryBytes': binary_size}

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--objects', nargs='*', default=[])
parser.add_argument('--remove', nargs='*', default=[])
parser.add_argument('--source', type=Path, default=ROOT / '_Blender/20260914_BladeRunner_AUXILIAR.blend')
parser.add_argument('--target', type=Path, default=REPO / 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb')
parser.add_argument('--apply', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert args.objects or args.remove, 'Select transforms and/or removals'
assert len(args.objects) == len(set(args.objects)) and len(args.remove) == len(set(args.remove))
assert not set(args.objects) & set(args.remove), 'An object cannot be updated and removed'

source_hash = sha(args.source.read_bytes())
raw = args.target.read_bytes()
doc, binary = read_glb(raw)
before_stats = stats(doc, len(binary))
updated = copy.deepcopy(doc)

# Resolve target nodes before the index list is compacted. Missing references
# are an expected no-op, not an error.
transform_indices = {}
missing_target = []
for name in args.objects:
    matches = [i for i, n in enumerate(doc['nodes']) if n.get('name') == name]
    assert len(matches) <= 1, f'Duplicate GLB node: {name}'
    if matches:
        transform_indices[name] = matches[0]
    else:
        missing_target.append(name)
remove_indices = set()
already_absent = []
for name in args.remove:
    matches = [i for i, n in enumerate(doc['nodes']) if n.get('name') == name]
    assert len(matches) <= 1, f'Duplicate GLB node: {name}'
    if matches:
        remove_indices.add(matches[0])
    else:
        already_absent.append(name)

bpy.ops.wm.open_mainfile(filepath=str(args.source), load_ui=False)
source = {}
missing_source = []
for name in args.objects:
    obj = bpy.data.objects.get(name)
    if obj is None:
        missing_source.append(name)
        continue
    # Visibility, renderability, object type and geometry are deliberately not
    # inspected: this path transfers only the saved reference transform.
    source[name] = obj.matrix_world.copy()

changes = []
for name, index in transform_indices.items():
    if name not in source:
        continue
    desired = C @ source[name] @ C.inverted()
    position, rotation, scale = desired.decompose()
    assert all(math.isfinite(x) for row in desired for x in row) and min(scale) > 0
    assert matrix_error(desired, Matrix.LocRotScale(position, rotation, scale)) < 1e-5, f'Shear unsupported: {name}'
    node = updated['nodes'][index]
    before = {k: node[k] for k in ('matrix', 'translation', 'rotation', 'scale') if k in node}
    if matrix_error(desired, node_matrix(node)) > 1e-6:
        node.pop('matrix', None)
        node['translation'] = list(position)
        node['rotation'] = [rotation.x, rotation.y, rotation.z, rotation.w]
        node['scale'] = list(scale)
    changes.append({'name': name, 'before': before,
        'after': {k: node[k] for k in ('matrix', 'translation', 'rotation', 'scale') if k in node},
        'blenderPosition': list(source[name].translation),
        'blenderRotationDegrees': [math.degrees(x) for x in source[name].to_euler('XYZ')]})

# Removal is deliberately limited to independent scene roots.
for index in remove_indices:
    assert index in doc['scenes'][doc.get('scene', 0)]['nodes'], f'Non-root removal: {doc["nodes"][index].get("name")}'
    assert not doc['nodes'][index].get('children')
    assert not any(index in n.get('children', []) for n in doc['nodes'])
    assert not any(ch['target'].get('node') == index for a in doc.get('animations', []) for ch in a['channels'])

old_nodes = updated['nodes']
keep_nodes = [i for i in range(len(old_nodes)) if i not in remove_indices]
node_remap = {old: new for new, old in enumerate(keep_nodes)}
updated['nodes'] = [old_nodes[i] for i in keep_nodes]
for scene in updated['scenes']:
    scene['nodes'] = [node_remap[i] for i in scene.get('nodes', []) if i in node_remap]
for node in updated['nodes']:
    if 'children' in node:
        node['children'] = [node_remap[i] for i in node['children'] if i in node_remap]

# Prune unique meshes and remap node references.
used_meshes = {n['mesh'] for n in updated['nodes'] if 'mesh' in n}
removed_mesh_names = [m.get('name') for i, m in enumerate(updated['meshes']) if i not in used_meshes]
updated['meshes'], mesh_remap = subset(updated['meshes'], used_meshes)
for node in updated['nodes']:
    if 'mesh' in node:
        node['mesh'] = mesh_remap[node['mesh']]

# Prune downstream resources only when no retained mesh/material needs them.
used_materials = {p['material'] for m in updated['meshes'] for p in m['primitives'] if 'material' in p}
updated['materials'], material_remap = subset(updated['materials'], used_materials)
for mesh in updated['meshes']:
    for primitive in mesh['primitives']:
        if 'material' in primitive:
            primitive['material'] = material_remap[primitive['material']]

used_textures = set()
for material in updated['materials']:
    texture_indices(material, used_textures)
updated['textures'], texture_remap = subset(updated.get('textures', []), used_textures)
for material in updated['materials']:
    remap_texture_indices(material, texture_remap)

used_images = {t['source'] for t in updated['textures'] if 'source' in t}
used_samplers = {t['sampler'] for t in updated['textures'] if 'sampler' in t}
updated['images'], image_remap = subset(updated.get('images', []), used_images)
updated['samplers'], sampler_remap = subset(updated.get('samplers', []), used_samplers)
for texture in updated['textures']:
    if 'source' in texture:
        texture['source'] = image_remap[texture['source']]
    if 'sampler' in texture:
        texture['sampler'] = sampler_remap[texture['sampler']]

used_accessors = set()
for mesh in updated['meshes']:
    for primitive in mesh['primitives']:
        if 'indices' in primitive:
            used_accessors.add(primitive['indices'])
        used_accessors.update(primitive.get('attributes', {}).values())
        for target in primitive.get('targets', []):
            used_accessors.update(target.values())
for animation in updated.get('animations', []):
    for sampler in animation['samplers']:
        used_accessors.update((sampler['input'], sampler['output']))
for skin in updated.get('skins', []):
    if 'inverseBindMatrices' in skin:
        used_accessors.add(skin['inverseBindMatrices'])
updated['accessors'], accessor_remap = subset(updated['accessors'], used_accessors)
for mesh in updated['meshes']:
    for primitive in mesh['primitives']:
        if 'indices' in primitive:
            primitive['indices'] = accessor_remap[primitive['indices']]
        primitive['attributes'] = {k: accessor_remap[v] for k, v in primitive.get('attributes', {}).items()}
        for target in primitive.get('targets', []):
            for key, value in list(target.items()):
                target[key] = accessor_remap[value]
for animation in updated.get('animations', []):
    for sampler in animation['samplers']:
        sampler['input'], sampler['output'] = accessor_remap[sampler['input']], accessor_remap[sampler['output']]
for skin in updated.get('skins', []):
    if 'inverseBindMatrices' in skin:
        skin['inverseBindMatrices'] = accessor_remap[skin['inverseBindMatrices']]

assert not any(a.get('sparse') for a in updated['accessors']), 'Sparse accessors are not supported'
used_views = {a['bufferView'] for a in updated['accessors'] if 'bufferView' in a}
used_views.update(i['bufferView'] for i in updated['images'] if 'bufferView' in i)
new_views, view_remap = subset(updated['bufferViews'], used_views)
new_binary = bytearray()
for old_index in sorted(used_views):
    old = doc['bufferViews'][old_index]
    assert old.get('buffer', 0) == 0 and not old.get('extensions')
    new_binary.extend(b'\0' * (-len(new_binary) % 4))
    start = old.get('byteOffset', 0)
    view = new_views[view_remap[old_index]]
    view['buffer'] = 0
    view['byteOffset'] = len(new_binary)
    new_binary.extend(binary[start:start + old['byteLength']])
updated['bufferViews'] = new_views
for accessor in updated['accessors']:
    if 'bufferView' in accessor:
        accessor['bufferView'] = view_remap[accessor['bufferView']]
for image in updated['images']:
    if 'bufferView' in image:
        image['bufferView'] = view_remap[image['bufferView']]
updated['buffers'] = [{'byteLength': len(new_binary)}]

candidate = write_glb(updated, bytes(new_binary))
check, check_binary = read_glb(candidate)
assert stats(check, len(check_binary)) == stats(updated, len(new_binary))
assert all(n.get('name') not in args.remove for n in check['nodes'])
assert sha(args.source.read_bytes()) == source_hash and args.target.read_bytes() == raw

stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
out = PROJECT / 'docs/transform-sync'
out.mkdir(parents=True, exist_ok=True)
report = {'source': str(args.source), 'sourceSha256': source_hash, 'target': str(args.target),
    'applied': args.apply, 'changed': candidate != raw, 'beforeSha256': sha(raw), 'afterSha256': sha(candidate),
    'beforeBytes': len(raw), 'afterBytes': len(candidate), 'resourcesBefore': before_stats,
    'resourcesAfter': stats(updated, len(new_binary)), 'transforms': changes,
    'skippedTransforms': {'missingInAuxiliary': missing_source, 'missingInGlb': missing_target},
    'removedNodes': [doc['nodes'][i].get('name') for i in sorted(remove_indices)],
    'alreadyAbsent': already_absent, 'removedMeshes': removed_mesh_names,
    'retainedMaterialNames': [m.get('name') for m in updated['materials']]}
if args.apply and candidate != raw:
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
print('SCENE_SYNC', json.dumps(report, ensure_ascii=False))
