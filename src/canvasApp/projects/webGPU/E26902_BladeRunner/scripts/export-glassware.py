"""Export the user's glassware unchanged, with empty vessels.
Run with Blender 5.1 --background --python this_file. Never saves the source blend.
"""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector
REPO = Path(__file__).resolve().parents[6]
SOURCE = REPO.parent.parent / '_Fuentes' / 'Vaso y licorera' / 'licorera_vaso_v2.blend'
OUTPUT = REPO / 'static/glbs/E26902_BladeRunner/Glassware.glb'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
bottle=bpy.data.objects['Licorera']
# Bake source transforms and only recenter. No remeshing, simplification or shape changes.
objects=[bpy.data.objects[n] for n in ['Licorera','Tapon','Vaso']]
bpy.context.view_layer.update()
report={'source':str(SOURCE),'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'liquid': False, 'meshes':{}}
for obj in objects:
    offset=Vector((bottle.location.x,bottle.location.y,0)) if obj.name!='Vaso' else Vector((obj.location.x,obj.location.y,0))
    # Save bottle offset before resetting any transforms.
    if obj.name=='Licorera': bottle_offset=offset.copy()
    if obj.name!='Vaso': offset=bottle_offset
    matrix=obj.matrix_world.copy()
    obj.data=obj.data.copy()
    for v in obj.data.vertices:v.co=matrix@v.co-offset
    obj.matrix_world.identity()
    obj.data.update()
    report['meshes'][obj.name]={'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),
        'min':[min(v.co[k] for v in obj.data.vertices) for k in range(3)],
        'max':[max(v.co[k] for v in obj.data.vertices) for k in range(3)]}
    # Export lightweight geometry; runtime defines the WebGPU materials.
    obj.data.materials.clear()
    obj.select_set(True)
for obj in scene.objects:obj.select_set(obj in objects)
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',use_selection=True,
    export_materials='NONE',export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
report['assetBytes']=OUTPUT.stat().st_size
report['assetSHA256']=hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
(REPO/'src/canvasApp/projects/webGPU/E26902_BladeRunner/docs/glassware-source.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))

