"""Read-only GLB texture/UV audit. Requires Pillow and NumPy; writes review artifacts only."""
import hashlib, io, json, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[4]
OUT = PROJECT / 'docs/phase3/3.1'
OUT.mkdir(parents=True, exist_ok=True)
asset = REPO / 'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_phase2.glb'
raw = asset.read_bytes(); jl = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+jl]); binary = raw[28+jl:]
report = {'assetSha256': hashlib.sha256(raw).hexdigest(), 'images': [], 'materials': [], 'issues': [], 'uv': {}}
decoded = []
for i, info in enumerate(doc['images']):
    v = doc['bufferViews'][info['bufferView']]
    blob = binary[v.get('byteOffset', 0):v.get('byteOffset', 0)+v['byteLength']]
    im = Image.open(io.BytesIO(blob)); im.load(); rgb = np.asarray(im.convert('RGB'), dtype=np.float32)/255
    entry = {'index': i, 'name': info.get('name'), 'size': list(im.size), 'mode': im.mode,
             'sha256': hashlib.sha256(blob).hexdigest(), 'channelsMin': rgb.min(axis=(0,1)).tolist(),
             'channelsMax': rgb.max(axis=(0,1)).tolist(), 'channelsMean': rgb.mean(axis=(0,1)).tolist()}
    if info.get('name','').endswith('_normal'):
        normals = rgb*2-1; lengths = np.linalg.norm(normals, axis=2)
        entry['normalLengthRange'] = [float(lengths.min()), float(lengths.max())]
        entry['normalNegativeZPixels'] = int((normals[:,:,2]<0).sum())
        if np.any(abs(lengths-1)>.02): report['issues'].append(f'Image {i}: abnormal normal lengths')
    report['images'].append(entry); decoded.append(im.copy())

uses = {}
for mi, mat in enumerate(doc['materials']):
    pbr = mat.get('pbrMetallicRoughness', {})
    entry = {'index': mi, 'name': mat.get('name'), 'metallicFactor': pbr.get('metallicFactor',1),
             'roughnessFactor': pbr.get('roughnessFactor',1), 'normalScale': mat.get('normalTexture',{}).get('scale',1), 'maps': {}}
    for role, ref, space, channel in [('baseColor',pbr.get('baseColorTexture'),'sRGB','RGB'),
            ('emissive',mat.get('emissiveTexture'),'sRGB','RGB'), ('normal',mat.get('normalTexture'),'data','RGB'),
            ('roughness',pbr.get('metallicRoughnessTexture'),'data','G'),
            ('metallic',pbr.get('metallicRoughnessTexture'),'data','B'), ('occlusion',mat.get('occlusionTexture'),'data','R')]:
        if ref is None: continue
        image = doc['textures'][ref['index']]['source']; uses.setdefault(image,set()).add(space)
        entry['maps'][role] = {'texture':ref['index'],'image':image,'space':space,'channel':channel,
                              'uvSet':ref.get('extensions',{}).get('KHR_texture_transform',{}).get('texCoord',ref.get('texCoord',0))}
        if role in ('roughness','metallic'):
            ch = 1 if role=='roughness' else 2
            factor = entry['roughnessFactor' if role=='roughness' else 'metallicFactor']
            entry[role+'EffectiveRange'] = [report['images'][image]['channelsMin'][ch]*factor, report['images'][image]['channelsMax'][ch]*factor]
    report['materials'].append(entry)
for image, spaces in uses.items():
    if len(spaces)>1: report['issues'].append(f'Image {image}: shared between color and data roles')

def accessor(index):
    a=doc['accessors'][index]; v=doc['bufferViews'][a['bufferView']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]; fmt='<'+{5126:'f',5125:'I',5123:'H'}[a['componentType']]*n
    offset=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',struct.calcsize(fmt))
    return np.array([struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])])
checked=0; collapsed=0; uv_ranges=[]; collapsed_details=[]
for mi, mesh in enumerate(doc['meshes']):
    for pi,p in enumerate(mesh['primitives']):
        refs=report['materials'][p['material']]['maps']
        for uvset in set(r['uvSet'] for r in refs.values()):
            key=f'TEXCOORD_{uvset}'
            if key not in p['attributes']:
                report['issues'].append(f'Mesh {mi}/{pi}: missing {key}'); continue
            uv=accessor(p['attributes'][key]); checked+=1
            if not np.isfinite(uv).all(): report['issues'].append(f'Mesh {mi}/{pi}: nonfinite UV')
            ids=accessor(p['indices']).reshape(-1,3).astype(int); t=uv[ids]; u=t[:,1]-t[:,0]; v=t[:,2]-t[:,0]
            mask=abs(u[:,0]*v[:,1]-u[:,1]*v[:,0])<1e-12
            collapsed+=int(mask.sum())
            if mask.any():
                points=accessor(p['attributes']['POSITION'])[ids[mask]]
                areas=np.linalg.norm(np.cross(points[:,1]-points[:,0],points[:,2]-points[:,0]),axis=1)*.5
                collapsed_details.append({'mesh':mi,'name':mesh.get('name'),'primitive':pi,'material':p['material'],
                    'triangles':int(mask.sum()),'areaSumM2':float(areas.sum()),'areaMaxM2':float(areas.max())})
            uv_ranges.append([float(uv.min()),float(uv.max())])
report['uv']={'texturedPrimitives':checked,'collapsedUVTriangles':collapsed,'collapsedDetails':collapsed_details,'range':[min(v[0] for v in uv_ranges),max(v[1] for v in uv_ranges)],'note':'UVs outside 0..1 are intentional tiling; collapsed UVs need visual review, not automatic geometry edits. Areas are local-space, unique mesh triangles.'}
report['samplers']=doc.get('samplers',[])
report['summary']={'materials':len(doc['materials']),'images':len(decoded),'colorImages':sum(v=={'sRGB'} for v in uses.values()),'dataImages':sum(v=={'data'} for v in uses.values()),'issues':len(report['issues'])}
(OUT/'texture-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
# Contact sheets: display raw data channels; never use these previews as runtime textures.
for start in (0,12):
    ids=list(range(start,min(start+12,24)))
    sheet=Image.new('RGB',(960,4*264),(25,25,25)); draw=ImageDraw.Draw(sheet)
    for offset,i in enumerate(ids):
        x=(offset%3)*320; y=(offset//3)*264
        preview=decoded[i].convert('RGB')
        if report['images'][i]['name'].endswith('_roughness'): preview=preview.getchannel('G').convert('RGB')
        preview.thumbnail((304,224)); sheet.paste(preview,(x+8,y+4))
        label=report['images'][i]['name'].replace('_',' ')
        draw.text((x+8,y+230),f'{i:02d} {label[:43]}',fill='white')
        draw.text((x+8,y+246),'G (data)' if i%3==2 else ('RGB (data)' if i%3==0 else 'RGB (sRGB)'),fill='white')
    sheet.save(OUT/f'texture-sheet-{start//12+1}.png')
print(json.dumps(report['summary'])); print(json.dumps(report['uv'])); print(json.dumps(report['issues']))
