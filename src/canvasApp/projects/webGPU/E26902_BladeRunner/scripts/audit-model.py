"""Read-only model audit. Run with Blender --background --factory-startup --disable-autoexec --python this_file."""
import bpy, json, struct, hashlib, math
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.kdtree import KDTree

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[4]
BLENDER = REPO.parents[1] / '_Blender'
OUT = PROJECT / 'docs/phase2/model-audit'
OUT.mkdir(parents=True, exist_ok=True)

def glb(path):
    raw = path.read_bytes()
    jl = struct.unpack_from('<I', raw, 12)[0]
    j = json.loads(raw[20:20+jl])
    binary = raw[28+jl:]
    def accessor(index):
        a = j['accessors'][index]
        assert not a.get('sparse'), 'Sparse accessors require an explicit decoder'
        v = j['bufferViews'][a['bufferView']]
        assert v.get('buffer', 0) == 0
        count = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        fmt = '<' + {5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']] * count
        offset = v.get('byteOffset',0) + a.get('byteOffset',0)
        stride = v.get('byteStride',struct.calcsize(fmt))
        return [struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])]
    worlds = {}
    def visit(i,parent):
        n = j['nodes'][i]
        if 'matrix' in n:
            local = Matrix([n['matrix'][k::4] for k in range(4)])
        else:
            q = n.get('rotation',[0,0,0,1])
            local = Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])), Quaternion((q[3],*q[:3])), Vector(n.get('scale',[1,1,1])))
        worlds[i] = parent @ local
        for c in n.get('children',[]): visit(c,worlds[i])
    for i in j['scenes'][j.get('scene',0)]['nodes']: visit(i,Matrix.Identity(4))
    objects = {}
    for i,n in enumerate(j['nodes']):
        if i not in worlds: continue
        tris = []
        if 'mesh' in n:
            for p in j['meshes'][n['mesh']]['primitives']:
                assert p.get('mode',4) == 4
                pos = [worlds[i] @ Vector(v) for v in accessor(p['attributes']['POSITION'])]
                ids = [v[0] for v in accessor(p['indices'])] if 'indices' in p else list(range(len(pos)))
                tris.extend(tuple(pos[k] for k in ids[t:t+3]) for t in range(0,len(ids),3))
        objects[n.get('name',str(i))] = {'node':n,'matrix':worlds[i],'triangles':tris}
    return raw,j,objects

def bounds(tris):
    return [[min(v[k] for t in tris for v in t) for k in range(3)], [max(v[k] for t in tris for v in t) for k in range(3)]]

def profile(tris, height):
    pts=[]
    for t in tris:
        for a,b in zip(t,(*t[1:],t[0])):
            if min(a.y,b.y) <= height <= max(a.y,b.y) and abs(a.y-b.y)>1e-9:
                pts.append(a+(b-a)*((height-a.y)/(b.y-a.y)))
    if not pts: return None
    return [min(p.x for p in pts),max(p.x for p in pts),min(p.z for p in pts),max(p.z for p in pts)]

def fingerprint(tris):
    # Order-independent triangle geometry, quantized to 0.01 mm; excludes materials.
    faces=sorted(tuple(sorted(tuple(round(v[k]*100000) for k in range(3)) for v in t)) for t in tris)
    return hashlib.sha256(repr(faces).encode()).hexdigest()

def compare(a,b):
    points=[list({tuple(v) for t in tris for v in t}) for tris in (a,b)]
    errors=[]
    for src,dst in (points,points[::-1]):
        tree=KDTree(len(dst))
        for i,p in enumerate(dst): tree.insert(p,i)
        tree.balance()
        errors.append(max(tree.find(p)[2] for p in src))
    return {'triangles':[len(a),len(b)],'maxNearestVertexDistance':max(errors),
            'vertexSetsMatchWithin1mm':max(errors)<.001,
            'sameQuantizedTriangleSignature':fingerprint(a)==fingerprint(b)}

active=REPO/'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_edited.glb'
raw,j,objects=glb(active)
_,_,baseline=glb(REPO/'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3.glb')
source=BLENDER/'Plantilla de referencia.blend'
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
columns=sorted(n for n in objects if n.startswith('Columna '))
centers=[objects[n]['matrix'].translation for n in columns]
ob=bpy.data.objects['Columns']; ob.data.calc_loop_triangles()
template=[[] for _ in columns]
for t in ob.data.loop_triangles:
    vs=[ob.matrix_world @ ob.data.vertices[k].co for k in t.vertices]
    vs=[Vector((v.x,v.z,-v.y)) for v in vs]
    mid=sum(vs,Vector())/3
    idx=min(range(len(centers)),key=lambda i:(mid.x-centers[i].x)**2+(mid.z-centers[i].z)**2)
    template[idx].append(tuple(vs))

report={'asset':str(active),'assetSha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
        'template':str(source),'method':'World-space triangle sections at 24 course midpoints; glTF Y up; tolerance 3 mm for 2.5 mm bevel.',
        'columns':[],'chairs':[],'lattice':[],'exterior':{}}
for i,name in enumerate(columns):
    tris=objects[name]['triangles']
    intervals=sorted((min(v.y for v in t),max(v.y for v in t)) for t in tris)
    courses=[]
    for lo,hi in intervals:
        if not courses or lo>courses[-1][1]+1e-5: courses.append([lo,hi])
        else: courses[-1][1]=max(courses[-1][1],hi)
    gaps=[courses[k+1][0]-courses[k][1] for k in range(len(courses)-1)]
    samples=[]
    for lo,hi in courses:
        h=(lo+hi)/2
        p=profile(tris,h); ref=profile(template[i],h)
        samples.append({'height':h,'active':p,'template':ref,'maxError':max(abs(a-b) for a,b in zip(p,ref)) if p and ref else None})
    diffs=[s['maxError'] for s in samples if s['maxError'] is not None]
    report['columns'].append({'name':name,'position':list(centers[i]),'triangles':len(tris),'bounds':bounds(tris),
        'courses':len(courses),'gaps':len(gaps),'gapMin':min(gaps) if gaps else None,'gapMax':max(gaps) if gaps else None,
        'maxTemplateProfileError':max(diffs) if diffs else None,'profilePass':len(diffs)==24 and max(diffs)<.003,
        'comparisonOriginalGlb':compare(tris,baseline[name]['triangles']),
        'widthLow':samples[2]['active'][1]-samples[2]['active'][0],
        'widthHigh':samples[21]['active'][1]-samples[21]['active'][0],'sections':samples})
for name,obj in objects.items():
    if name.startswith('Sillon '):
        report['chairs'].append({'name':name,'mesh':obj['node']['mesh'],'position':list(obj['matrix'].translation),
            'forward':list(obj['matrix'].to_quaternion() @ Vector((0,0,1))), 'triangles':len(obj['triangles']),
            'comparisonOriginalGlb':compare(obj['triangles'],baseline[name]['triangles'])})
    if name.startswith('Relieves y celosias'):
        report['lattice'].append({'name':name,'triangles':len(obj['triangles']),
            'comparisonOriginalGlb':compare(obj['triangles'],baseline[name]['triangles'])})
ext=objects['Tyrell_Corporation_Pyramid']
report['exterior']={'bounds':bounds(ext['triangles']),'triangles':len(ext['triangles']),
    'comparisonOriginalGlb':compare(ext['triangles'],baseline['Tyrell_Corporation_Pyramid']['triangles'])}
source_ext=bpy.data.objects['Tyrell_Corporation_Pyramid']; source_ext.data.calc_loop_triangles()
template_ext=[]
for t in source_ext.data.loop_triangles:
    vs=[source_ext.matrix_world @ source_ext.data.vertices[k].co for k in t.vertices]
    template_ext.append(tuple(Vector((v.x,v.z,-v.y)) for v in vs))
report['exterior']['comparisonTemplate']=compare(ext['triangles'],template_ext)
# Isolate translation from camera rotation: shift CAM 01 1.78 m left (CAM 04 X).
cam=objects['CAM 01 | fotograma general']['matrix'].translation
focal=800/(2*math.tan(j['cameras'][objects['CAM 01 | fotograma general']['node']['camera']]['perspective']['yfov']/2))
apex=max((v for t in ext['triangles'] for v in t),key=lambda v:v.y)
near=Vector((3,2.9,0))
report['parallax']={'method':'Horizontal translation only, CAM 01 orientation/FOV fixed, 1920x800; magnitude in pixels, no occlusion test.',
    'translationMetres':1.78,'foregroundPoint':list(near),'exteriorApex':list(apex),
    'foregroundPixelShift':focal*1.78/(cam.z-near.z),'exteriorPixelShift':focal*1.78/(cam.z-apex.z)}
report['cameras']=[{'name':name,'position':list(obj['matrix'].translation),
    'yfov':j['cameras'][obj['node']['camera']]['perspective']['yfov']} for name,obj in objects.items() if name.startswith('CAM ') and 'camera' in obj['node']]
report['summary']={'columnCount':len(columns),'allColumns24Courses23Gaps':all(c['courses']==24 and c['gaps']==23 for c in report['columns']),
    'allProfilesMatchTemplate':all(c['profilePass'] for c in report['columns']),
    'chairCount':len(report['chairs']),'chairUniqueMeshes':len(set(c['mesh'] for c in report['chairs'])),
    'latticeBatches':len(report['lattice']),'latticeTriangles':sum(c['triangles'] for c in report['lattice'])}
(OUT/'geometry.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('AUDIT_SUMMARY',json.dumps(report['summary']),flush=True)
