"""Inspect source material links and color spaces without saving the blend."""
import bpy, json, hashlib
from pathlib import Path
PROJECT=Path(__file__).resolve().parents[1]; REPO=PROJECT.parents[4]
source=REPO.parents[1]/'_Blender/BladeRunner_5_6_High_v3.blend'
out=PROJECT/'docs/phase3/3.1'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rows=[]
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    images=[{'node':n.name,'image':n.image.name,'space':n.image.colorspace_settings.name,'size':list(n.image.size)} for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
    links=[{'from':l.from_node.name,'output':l.from_socket.name,'to':l.to_node.name,'input':l.to_socket.name} for l in mat.node_tree.links]
    normals=[{'node':n.name,'space':n.space,'strength':n.inputs['Strength'].default_value} for n in mat.node_tree.nodes if n.type=='NORMAL_MAP']
    rows.append({'name':mat.name,'images':images,'links':links,'normalMaps':normals})
report={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'materials':rows}
(out/'blender-materials.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('SOURCE_MATERIALS',len(rows))
