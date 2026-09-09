"""Offline Blender preview of material changes; not a WebGPU fidelity test. Never saves source blend."""
import bpy, json
from pathlib import Path
from mathutils import Vector
project=Path(__file__).resolve().parents[1];repo=project.parents[4];out=project/'docs/phase3/3.2-3.3'
recipe=json.loads((out/'look.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(repo/'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb'))
scene=bpy.context.scene
for obj in list(scene.objects):
    if obj.type=='LIGHT': bpy.data.objects.remove(obj,do_unlink=True)
    elif obj.name.startswith(('Cielo','Sol')): obj.hide_render=True
world=bpy.data.worlds.new('Neutral review');world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.18,.18,.18,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.5;scene.world=world
# Positions converted from glTF Y-up to Blender Z-up.
for pos,target,power in [((-5,5,6),(0,9,1),1800),((6,12,4),(0,8,1),900)]:
    light=bpy.data.lights.new('Neutral review area','AREA');light.energy=power;light.shape='DISK';light.size=8
    obj=bpy.data.objects.new(light.name,light);scene.collection.objects.link(obj);obj.location=pos
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=533;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
camera=next(o for o in scene.objects if o.type=='CAMERA' and o.name.startswith('CAM 02'))
camera.scale=(1,1,1);scene.camera=camera
scene.render.filepath=str(out/'blender-imported.png');bpy.ops.render.render(write_still=True)
for mat in bpy.data.materials:
    change=recipe['materials'].get(mat.name)
    if not change or not mat.node_tree: continue
    bsdf=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not bsdf: continue
    if 'tint' in change:
        socket=bsdf.inputs['Base Color']; tint=change['tint']
        if socket.is_linked:
            original=socket.links[0].from_socket
            mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1)
            mat.node_tree.links.new(original,mix.inputs[1]);mat.node_tree.links.new(mix.outputs[0],socket)
        else: socket.default_value=tuple(socket.default_value[k]*tint[k] for k in range(3))+(socket.default_value[3],)
    if 'color' in change: bsdf.inputs['Base Color'].default_value=(*change['color'],1)
    for key,socket in [('roughness','Roughness'),('metalness','Metallic'),('transmission','Transmission Weight')]:
        if key in change and not bsdf.inputs[socket].is_linked: bsdf.inputs[socket].default_value=change[key]
    if 'normal' in change:
        for node in mat.node_tree.nodes:
            if node.type=='NORMAL_MAP': node.inputs['Strength'].default_value=change['normal']
scene.render.filepath=str(out/'blender-tyrell-v1.png');bpy.ops.render.render(write_still=True)
print('Offline preview complete. glTF thickness is not reproduced; validate glass in WebGPU.')
