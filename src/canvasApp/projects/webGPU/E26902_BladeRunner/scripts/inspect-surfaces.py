"""Phase 2: inspect the active GLB in memory and render neutral review frames. Never saves a blend."""
import bpy, json, math, struct, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

PROJECT=Path(__file__).resolve().parents[1]
REPO=PROJECT.parents[4]
OUT=PROJECT/'docs/phase2/surfaces'
if '--processed' in sys.argv: OUT=OUT/'clean'
OUT.mkdir(parents=True,exist_ok=True)
ASSET=REPO/'static/glbs/E26902_BladeRunner/BladeRunner_5_6_High_v3_edited.glb'
if '--processed' in sys.argv: ASSET=ASSET.with_name('BladeRunner_5_6_High_v3_phase2.glb')
raw=ASSET.read_bytes(); jl=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+jl]); data=raw[28+jl:]
def read(idx):
    a=doc['accessors'][idx]; v=doc['bufferViews'][a['bufferView']]
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    fmt='<'+{5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]*width
    offset=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',struct.calcsize(fmt))
    return [struct.unpack_from(fmt,data,offset+i*stride) for i in range(a['count'])]

report={'asset':str(ASSET),'meshAttributes':[],'objects':[],'contacts':[]}
for i,m in enumerate(doc['meshes']):
    entry={'mesh':i,'name':m.get('name'),'triangles':0,'nonFinite':0,'badNormalLengths':0,'missingNormals':0,'normalMappedWithoutUV':0,'normalMappedWithoutTangents':0,'degenerateTriangles':0,'opposingNormalTriangles':0}
    for p in m['primitives']:
        attrs=p['attributes']; pos=[Vector(v) for v in read(attrs['POSITION'])]
        normals=[Vector(v) for v in read(attrs['NORMAL'])] if 'NORMAL' in attrs else []
        idx=[v[0] for v in read(p['indices'])] if 'indices' in p else list(range(len(pos)))
        entry['nonFinite']+=sum(not all(math.isfinite(x) for x in v) for v in pos+normals)
        entry['badNormalLengths']+=sum(abs(v.length-1)>.01 for v in normals)
        entry['missingNormals']+=int(not normals)
        mat=doc['materials'][p['material']]
        if 'normalTexture' in mat:
            entry['normalMappedWithoutUV']+=int('TEXCOORD_0' not in attrs)
            entry['normalMappedWithoutTangents']+=int('TANGENT' not in attrs)
        for k in range(0,len(idx),3):
            a,b,c=idx[k:k+3]; entry['triangles']+=1
            face=(pos[b]-pos[a]).cross(pos[c]-pos[a])
            if face.length<2e-10: entry['degenerateTriangles']+=1
            elif normals and face.normalized().dot((normals[a]+normals[b]+normals[c]).normalized())<-.1:
                entry['opposingNormalTriangles']+=1
    report['meshAttributes'].append(entry)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ASSET))
scene=bpy.context.scene
for o in scene.objects:
    if o.type!='MESH': continue
    bb=[o.matrix_world@Vector(v) for v in o.bound_box]
    report['objects'].append({'name':o.name,'scale':list(o.scale),'determinant':o.matrix_world.to_3x3().determinant(),
        'bounds':[[min(v[k] for v in bb) for k in range(3)],[max(v[k] for v in bb) for k in range(3)]]})

def tree(o):
    return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons],all_triangles=False)

# Probe actual geometry at bottom vertices, not only bounding box overlap.
floors=[o for o in scene.objects if o.type=='MESH' and (o.name.startswith('Pavimento') or o.name=='Podest')]
floor_trees=[tree(o) for o in floors]
table=bpy.data.objects.get('Table_Slab'); table_tree=tree(table)
table_supports=[table_tree]+[tree(o) for o in scene.objects if o.name=='Mesa | campo de cuero']
for o in scene.objects:
    if o.type!='MESH': continue
    if o.name.startswith('Sillon ') or o.name in ['Cut crystal decanter','Crystal tumbler','Crystal tumbler.001','Instrument case','Leather folio']:
        vs=[o.matrix_world@v.co for v in o.data.vertices]
        low=min(v.z for v in vs)
        pts=[v for v in vs if v.z<low+.0001]
        gaps=[]
        for v in pts:
            supports=floor_trees if o.name.startswith('Sillon ') else table_supports
            hits=[t.ray_cast(v+Vector((0,0,.1)),Vector((0,0,-1)),.5)[0] for t in supports]
            heights=[h.z for h in hits if h is not None]
            if heights: gaps.append(v.z-max(heights))
        report['contacts'].append({'name':o.name,'minZ':low,'bottomProbes':len(pts),'hits':len(gaps),'gapMin':min(gaps) if gaps else None,'gapMax':max(gaps) if gaps else None})

# Triangle intersections: evidence for contact review, not automatic collision verdict.
chairs=[o for o in scene.objects if o.name.startswith('Sillon ')]
report['chairTableSurfaceIntersections']=[{'name':o.name,'trianglePairs':len(tree(o).overlap(table_tree))} for o in chairs]
report['glassMaterials']=[m for m in doc['materials'] if m.get('extensions',{}).get('KHR_materials_transmission')]
(OUT/'inspection.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('SURFACE_SUMMARY',json.dumps({k:sum(m[k] for m in report['meshAttributes']) for k in ['nonFinite','badNormalLengths','missingNormals','normalMappedWithoutUV','normalMappedWithoutTangents','degenerateTriangles','opposingNormalTriangles']}),flush=True)

# Neutral workbench frames preserve geometry, omit scene lights/textures and disable glass transmission.
for o in scene.objects:
    if o.name.startswith('Cielo ') or o.name.startswith('Sol '): o.hide_render=True
scene.render.engine='BLENDER_WORKBENCH'
sh=scene.display.shading; sh.light='STUDIO'; sh.color_type='SINGLE'; sh.single_color=(.55,.55,.55)
# Workbench shadow volumes produce long diagonal artifacts with the distant exterior.
# Inspect surfaces with studio lighting/cavity alone; production shadows are reviewed separately.
sh.show_shadows=False; sh.show_cavity=True; sh.cavity_type='BOTH'; sh.background_type='WORLD'
if scene.world is None: scene.world=bpy.data.worlds.new('Review world')
scene.world.color=(.15,.15,.15)
scene.render.resolution_x=1920; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for number in (1,2,3,4):
    camera=next(o for o in scene.objects if o.type=='CAMERA' and o.name.startswith(f'CAM {number:02d}'))
    camera.scale=(1,1,1); camera.data.clip_start=.03; camera.data.clip_end=2500; scene.camera=camera
    scene.render.filepath=str(OUT/f'neutral-cam{number:02d}.png')
    bpy.ops.render.render(write_still=True)
