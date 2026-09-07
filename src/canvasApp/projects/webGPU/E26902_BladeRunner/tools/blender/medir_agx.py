# Measures Blender's own colour pipeline so the viewer's tone mapping can be checked against
# numbers instead of against an opinion. Writes one 16-bit PNG strip per look; each pixel is a
# known linear scene value, so the PNG encodes the transfer curve Blender applied.
#
#   "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup \
#       --python tools/blender/medir_agx.py -- <carpeta de salida>
#
# The reference renders were made with view transform AgX, look "AgX - Medium High Contrast"
# and exposure +0.1 EV (see _Blender/build_tyrell_v3.py and finish_tyrell_v3.py).
import sys, json, math
import bpy

out_dir = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
SAMPLES = 1024
MIN_EV, MAX_EV = -14.0, 6.0

scene = bpy.context.scene
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '16'
scene.render.image_settings.compression = 0
scene.display_settings.display_device = 'sRGB'
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0
scene.view_settings.use_curve_mapping = False

image = bpy.data.images.new('ramp', width=SAMPLES, height=1, float_buffer=True, is_data=False)
values = [2.0 ** (MIN_EV + i * (MAX_EV - MIN_EV) / (SAMPLES - 1)) for i in range(SAMPLES)]
pixels = []
for v in values:
    pixels += [v, v, v, 1.0]
image.pixels.foreach_set(pixels)

# Blender's colour management enums cannot be introspected in background mode, so the values
# are assigned directly and a failure is reported rather than silently skipped.
written = {}
for transform, look in [('Standard', 'None'), ('AgX', 'None'),
                        ('AgX', 'AgX - Base Contrast'), ('AgX', 'AgX - Medium High Contrast')]:
    scene.view_settings.view_transform = transform
    scene.view_settings.look = look
    name = f'{transform}__{look}'.replace(' ', '_').replace('-', '').replace('__', '_')
    path = f'{out_dir}/rampa_{name}.png'
    image.save_render(filepath=path, scene=scene)
    written[f'{transform} / {look}'] = path
    print(f'escrito {path}')

meta = {
    'samples': SAMPLES, 'minEV': MIN_EV, 'maxEV': MAX_EV,
    'blender': bpy.app.version_string,
    'displayDevice': scene.display_settings.display_device,
    'looks': list(written.keys()),
    'files': written,
    'note': 'Cada columna i del PNG codifica el valor lineal 2**(minEV + i*(maxEV-minEV)/(samples-1)).'
}
with open(f'{out_dir}/rampa_meta.json', 'w', encoding='utf-8') as handle:
    json.dump(meta, handle, indent=2, ensure_ascii=False)
print('listo')
