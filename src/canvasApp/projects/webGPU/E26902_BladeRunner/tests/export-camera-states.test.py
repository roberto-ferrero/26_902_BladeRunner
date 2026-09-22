"""Run with Blender --background --disable-autoexec --python-exit-code 1 --python FILE."""
import importlib.util
import math
import sys
from pathlib import Path

import bpy

script = Path(__file__).resolve().parents[1] / 'scripts/export-camera-states.py'
spec = importlib.util.spec_from_file_location('camera_export', script)
exporter = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(exporter)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.unit_settings.scale_length = .5
camera = bpy.data.objects.new('cameraspot-demo', bpy.data.cameras.new('Lens'))
target = bpy.data.objects.new('cameratarget-DEMO', None)
parent = bpy.data.objects.new('Parent', None)
for obj in [camera, target, parent]:
    scene.collection.objects.link(obj)
parent.location = (10, 20, 30)
camera.parent = parent
camera.location = (1, 2, 3)
camera.scale = (.01, .01, .01)
target.location = (4, 5, 6)
track = camera.constraints.new('TRACK_TO')
track.target = target
track.track_axis, track.up_axis = 'TRACK_NEGATIVE_Z', 'UP_Y'
camera.data.sensor_fit = 'HORIZONTAL'
camera.data.sensor_width, camera.data.lens = 36, 50
bpy.context.view_layer.update()
states, warnings = exporter.export_states(scene)
state = states[0]
assert state['position'] == [5.5, 16.5, -11.0], state
assert state['target'] == [2, 3, -2.5]
expected = math.degrees(2 * math.atan(36 / (2 * 50) * 900 / 1600))
assert abs(state['fov'] - expected) < 1e-5
assert len(warnings) == 1
assert abs(state['near'] - camera.data.clip_start * .5) < 1e-8


def rejects():
    bpy.context.view_layer.update()
    try:
        exporter.export_states(scene)
    except ValueError:
        return
    raise AssertionError('Invalid camera was accepted')


camera.data.type = 'ORTHO'
rejects()
camera.data.type = 'PERSP'
track.target = None
rejects()
track.target = target
track.influence = .5
rejects()
track.influence = 1
target.name = 'cameratarget-wrong'
rejects()
target.name = 'cameratarget-demo'
target.location = camera.matrix_world.translation
rejects()
print('CAMERA_EXPORT_TESTS: world coordinates, scale, FOV, casing and invalid inputs passed')
