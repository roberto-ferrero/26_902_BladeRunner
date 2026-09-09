"""Read-only pavement geometry, UV, wear and normal-slope measurements. Pillow + NumPy."""
import io,json,struct,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
project=Path(__file__).resolve().parents[1];repo=project.parents[4];out=project/'docs/phase3/3.4';out.mkdir(parents=True,exist_ok=True)
raw=(repo/'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb').read_bytes()
jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);binary=raw[28+jl:]
mi=next(i for i,m in enumerate(doc['materials']) if m['name']=='PBR | Piedra negra pulida');mat=doc['materials'][mi]
def image(ref):
    source=doc['textures'][ref['index']]['source'];im=doc['images'][source];v=doc['bufferViews'][im['bufferView']]
    blob=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
    return np.asarray(Image.open(io.BytesIO(blob)).convert('RGB'),dtype=np.float64)/255,hashlib.sha256(blob).hexdigest()
normal,nh=image(mat['normalTexture']);roughness,rh=image(mat['pbrMetallicRoughness']['metallicRoughnessTexture']);color,ch=image(mat['pbrMetallicRoughness']['baseColorTexture'])
n=normal*2-1
angles={}
for scale in (0,.025,.035):
    angle=np.degrees(np.arctan2(np.linalg.norm(n[:,:,:2]*scale,axis=2),n[:,:,2]))
    angles[str(scale)]={'maxDegrees':float(angle.max()),'p95Degrees':float(np.percentile(angle,95))}
def accessor(idx):
    a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']];width={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
    fmt='<'+{5126:'f',5125:'I',5123:'H'}[a['componentType']]*width
    offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',struct.calcsize(fmt))
    return np.array([struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])])
meshes=[]
for i,mesh in enumerate(doc['meshes']):
    for pi,p in enumerate(mesh['primitives']):
        if p['material']!=mi:continue
        uv=accessor(p['attributes']['TEXCOORD_0']);pos=accessor(p['attributes']['POSITION']);ids=accessor(p['indices']).reshape(-1,3).astype(int)
        t=uv[ids];u=t[:,1]-t[:,0];v=t[:,2]-t[:,0]
        meshes.append({'mesh':i,'primitive':pi,'name':mesh.get('name'),'triangles':len(ids),'boundsLocal':[pos.min(axis=0).tolist(),pos.max(axis=0).tolist()],
                       'collapsedUVTriangles':int((abs(u[:,0]*v[:,1]-u[:,1]*v[:,0])<1e-12).sum())})
nodes=[{'name':o.get('name'),'mesh':o['mesh'],'translation':o.get('translation'),'scale':o.get('scale')} for o in doc['nodes'] if o.get('mesh') in {m['mesh'] for m in meshes}]
report={'assetSha256':hashlib.sha256(raw).hexdigest(),'material':mat['name'],'normalAngularDeviation':angles,
        'roughness':{'min':float(roughness[:,:,1].min()),'max':float(roughness[:,:,1].max()),'p50':float(np.median(roughness[:,:,1])),'p95':float(np.percentile(roughness[:,:,1],95))},
        'imageSha256':{'normal':nh,'roughness':rh,'color':ch},'meshPrimitives':meshes,'nodes':nodes,
        'note':'Angles describe decoded texture normals on a flat tangent frame; not total mesh shading or screen-space reflection distortion. Bounds are local; translations are glTF Y-up.'}
(out/'floor-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
Image.fromarray((roughness[:,:,1]*255).astype('uint8')).save(out/'roughness-G.png')
print(json.dumps({'angles':angles,'roughness':report['roughness'],'meshes':len(meshes),'nodes':len(nodes),'collapsedUV':sum(m['collapsedUVTriangles'] for m in meshes)}))
