"""Read template profiles; export recessed solid column cores. Never save the source Blender."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector
project=Path(__file__).resolve().parents[1]
repo=project.parents[4]
source=repo.parents[1]/'_Blender'/'Plantilla de referencia.blend'
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
o=bpy.data.objects['Columns']
me=o.data.copy();me.transform(o.matrix_world);me.update()
centers=[(sx*x,y) for sx in (-1,1) for x,ys in [(3,[-8.1015,0,5.4,13.2]),(9,[-8.1015,-2.7015,2.6985,8.1015,13.2])] for y in ys]
groups=[[] for _ in centers]
for p in me.polygons:
    c=p.center;i=min(range(len(centers)),key=lambda j:(c.x-centers[j][0])**2+(c.y-centers[j][1])**2)
    groups[i].append(tuple(p.vertices))
positions=[];cores=[]
for i,((cx,cy),faces) in enumerate(zip(centers,groups)):
    ids=sorted({j for f in faces for j in f});remap={j:k for k,j in enumerate(ids)}
    mesh=bpy.data.meshes.new('core')
    # Uniform planar inset preserves asymmetric/inverted profiles and leaves the visible joints recessed.
    verts=[(cx+(me.vertices[j].co.x-cx)*.97,cy+(me.vertices[j].co.y-cy)*.97,me.vertices[j].co.z) for j in ids]
    mesh.from_pydata(verts,[],[tuple(remap[j] for j in f) for f in faces]);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    bmesh.ops.dissolve_limit(bm,angle_limit=.001,verts=list(bm.verts),edges=list(bm.edges))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        for j in tri.vertices:
            v=mesh.vertices[j].co;positions.extend([round(v.x,7),round(v.z,7),round(-v.y,7)])
    cores.append({'column':i+1,'triangles':len(mesh.loop_triangles)})
unique={}; compact=[]; indices=[]
for j in range(0,len(positions),3):
    key=tuple(positions[j:j+3])
    if key not in unique:
        unique[key]=len(compact)//3;compact.extend(key)
    indices.append(unique[key])
out=project/'column-cores.json'
out.write_text(json.dumps({'source':'Plantilla de referencia.blend / Columns','planarScale':.97,'cores':cores,'positions':compact,'indices':indices},separators=(',',':')),encoding='utf8')
print('CORE_TRIANGLES',len(positions)//9,flush=True)
