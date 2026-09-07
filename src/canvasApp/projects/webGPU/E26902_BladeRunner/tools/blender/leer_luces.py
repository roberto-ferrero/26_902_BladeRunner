# Reads the authoritative lighting rig out of the master .blend, because the GLB only carries the
# sun: KHR_lights_punctual has no area lights, so the four fills never left Blender.
#
#   blender.exe --background --factory-startup <master.blend> \
#       --python tools/blender/leer_luces.py -- <carpeta de salida>
#
# Writes luces-blender.json. Positions come out in glTF axes (Y up, metres) so the viewer can use
# them directly; Blender is Z up, and the conversion is (x, y, z) -> (x, z, -y).
import sys, json, math
import bpy
from mathutils import Vector, Quaternion

out_dir = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
scene = bpy.context.scene

def to_gltf_point(v):
    return [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]

def to_gltf_dir(v):
    return [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]

lights = []
for obj in bpy.data.objects:
    if obj.type != 'LIGHT':
        continue
    data = obj.data
    matrix = obj.matrix_world
    # A Blender lamp shines along its local -Z.
    direction = (matrix.to_quaternion() @ Vector((0.0, 0.0, -1.0))).normalized()
    entry = {
        'name': obj.name,
        'type': data.type,
        'energy': data.energy,
        'color': [round(c, 6) for c in data.color],
        'positionBlender': [round(c, 6) for c in matrix.translation],
        'position': to_gltf_point(matrix.translation),
        'directionBlender': [round(c, 6) for c in direction],
        'direction': to_gltf_dir(direction),
        'target': to_gltf_point(matrix.translation + direction * 5.0),
        'visible': not obj.hide_render,
    }
    # A lamp can be told to contribute less to the specular than to the diffuse, which would
    # explain a floor that is right in diffuse and too bright in reflection.
    for factor in ('diffuse_factor', 'specular_factor', 'volume_factor'):
        if hasattr(data, factor):
            entry[factor] = getattr(data, factor)
    entry['useShadow'] = getattr(data, 'use_shadow', None)
    cycles = getattr(data, 'cycles', None)
    if cycles is not None:
        entry['cycles'] = {key: getattr(cycles, key) for key in
                           ('cast_shadow', 'use_multiple_importance_sampling', 'max_bounces', 'is_caustics_light')
                           if hasattr(cycles, key)}
    visibility = getattr(obj, 'visible_camera', None)
    entry['visibility'] = {
        'camera': obj.visible_camera, 'diffuse': obj.visible_diffuse,
        'glossy': obj.visible_glossy, 'transmission': obj.visible_transmission,
        'volumeScatter': obj.visible_volume_scatter, 'shadow': obj.visible_shadow
    } if visibility is not None else None

    if data.type == 'AREA':
        entry['shape'] = data.shape
        entry['sizeX'] = data.size
        entry['sizeY'] = data.size_y if data.shape in {'RECTANGLE', 'ELLIPSE'} else data.size
        # Blender area lamps are given in watts; radiance is the power spread over the emitting
        # face and the hemisphere, which is what a RectAreaLight in Three.js takes.
        area = entry['sizeX'] * entry['sizeY']
        entry['areaM2'] = round(area, 6)
        entry['radiance'] = round(data.energy / (area * math.pi), 6) if area > 0 else None
    if data.type == 'SUN':
        entry['angle'] = getattr(data, 'angle', None)
        # The exporter turns W/m2 into lux with the 683 luminous efficacy constant.
        entry['luxIfExported'] = round(data.energy * 683.0, 3)
    if data.type in {'POINT', 'SPOT'}:
        entry['radius'] = getattr(data, 'shadow_soft_size', None)
    lights.append(entry)

world = {}
if scene.world and scene.world.node_tree:
    background = scene.world.node_tree.nodes.get('Background')
    if background:
        world = {
            'strength': background.inputs['Strength'].default_value,
            'color': [round(c, 6) for c in background.inputs['Color'].default_value[:3]],
            'colorLinked': background.inputs['Color'].is_linked,
        }

report = {
    'blend': bpy.data.filepath,
    'blender': bpy.app.version_string,
    'unit': scene.unit_settings.system,
    'scaleLength': scene.unit_settings.scale_length,
    'note': 'Posiciones y direcciones en ejes glTF (Y arriba, metros). Blender es Z arriba y la conversion es (x, y, z) -> (x, z, -y).',
    'view': {
        'transform': scene.view_settings.view_transform,
        'look': scene.view_settings.look,
        'exposure': scene.view_settings.exposure,
        'gamma': scene.view_settings.gamma,
    },
    'world': world,
    'lights': lights,
}
path = f'{out_dir}/luces-blender.json'
with open(path, 'w', encoding='utf-8') as handle:
    json.dump(report, handle, indent=2, ensure_ascii=False)
print(f'escrito {path}')
for light in lights:
    print(f"  {light['name']:34s} {light['type']:6s} energia {light['energy']:8.3f} "
          f"pos {light['position']} dir {light['direction']}")
print(f"  mundo: {world}")
print(f"  vista: {report['view']}")
