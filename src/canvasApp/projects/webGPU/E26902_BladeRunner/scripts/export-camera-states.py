"""Export camera spots/Track To targets without saving the source .blend or geometry.

blender --background --disable-autoexec --python-exit-code 1 --python SCRIPT
Optional arguments after --: --source FILE --output FILE.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[4]
ROOT = REPO.parents[1]
COORDINATES = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))


def export_states(scene):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    unit = scene.unit_settings.scale_length
    render = scene.render
    states, ids, warnings = [], set(), []
    for obj in sorted(scene.objects, key=lambda item: item.name):
        if not obj.name.startswith('cameraspot-'):
            continue
        state_id = obj.name[len('cameraspot-'):]
        if not state_id or state_id.casefold() in ids:
            raise ValueError(f'Empty or duplicate cameraStateId: {obj.name}')
        ids.add(state_id.casefold())
        if obj.type != 'CAMERA' or obj.data.type != 'PERSP':
            raise ValueError(f'{obj.name}: expected a perspective camera')
        constraints = [c for c in obj.constraints if c.type == 'TRACK_TO' and not c.mute and c.influence > 0]
        if len(constraints) != 1:
            raise ValueError(f'{obj.name}: expected one active Track To constraint')
        track = constraints[0]
        target = track.target
        expected = 'cameratarget-' + state_id
        if target is None or target.type != 'EMPTY' or target.name.casefold() != expected.casefold() or target.name not in scene.objects:
            raise ValueError(f'{obj.name}: Track To must point to empty {expected}')
        if track.influence != 1 or track.track_axis != 'TRACK_NEGATIVE_Z' or track.up_axis != 'UP_Y' or track.use_target_z:
            raise ValueError(f'{obj.name}: use Track -Z, Up Y, influence 1, Target Z disabled')
        if target.name != expected:
            warnings.append(f'{obj.name}: accepted target casing {target.name} (expected {expected})')
        camera = obj.evaluated_get(depsgraph)
        position = COORDINATES @ camera.matrix_world.translation * unit
        aim = COORDINATES @ target.evaluated_get(depsgraph).matrix_world.translation * unit
        if (position - aim).length < 1e-6:
            raise ValueError(f'{obj.name}: camera and target coincide')
        # Blender sensor fit and pixel aspect determine the vertical FOV consumed by Three.js.
        projection = camera.calc_matrix_camera(depsgraph, x=render.resolution_x, y=render.resolution_y,
                                               scale_x=render.pixel_aspect_x, scale_y=render.pixel_aspect_y)
        states.append({'cameraStateId': state_id, 'cameraSpot': obj.name, 'cameraTarget': target.name,
                       'position': list(position), 'target': list(aim),
                       'fov': math.degrees(2 * math.atan(1 / projection[1][1])),
                       'near': camera.data.clip_start * unit, 'far': camera.data.clip_end * unit})
    if not states:
        raise ValueError('No cameraspot-* cameras found; existing export was not changed')
    return states, warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / '_Blender/20260914_BladeRunner_AUXILIAR.blend')
    parser.add_argument('--output', type=Path, default=PROJECT / 'cameraStates.generated.json')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(args.source), load_ui=False)
    states, warnings = export_states(bpy.context.scene)
    document = {'version': 1, 'source': args.source.name, 'sourceSha256': digest,
                'coordinates': 'metres, Y up; Blender (x, y, z) -> (x, z, -y)',
                'fovUnits': 'vertical degrees', 'warnings': warnings, 'cameraStates': states}
    encoded = json.dumps(document, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Source changed during export; retry')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.json.tmp')
    temporary.write_text(encoded, encoding='utf-8')
    temporary.replace(args.output)
    print('CAMERA_STATES', json.dumps({'output': str(args.output), 'states': [s['cameraStateId'] for s in states], 'warnings': warnings}))


if __name__ == '__main__':
    main()
