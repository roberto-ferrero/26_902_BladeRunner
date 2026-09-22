"""Read the current saved auxiliary placement without modifying the .blend."""
import bpy, hashlib, json
from pathlib import Path
from mathutils import Matrix

project=Path(__file__).resolve().parents[1]
root=project.parents[4].parents[1]
source=root/'_Blender/20260914_BladeRunner_AUXILIAR.blend'
digest=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
obj=bpy.data.objects.get('VK_Referencia')
assert obj and obj.get('reference_role')=='VK_DEVICE_PLACEMENT'
assert obj.parent is None
assert abs(bpy.context.scene.unit_settings.scale_length-1)<1e-8
conversion=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
matrix=conversion@obj.matrix_world@conversion.inverted()
position,quaternion,scale=matrix.decompose()
result={'version':1,'source':source.name,'sourceSha256':digest,'object':obj.name,
    'coordinates':'metres, Y up; Blender (x, y, z) -> (x, z, -y)',
    'matrix':[matrix[r][c] for c in range(4) for r in range(4)],
    'position':list(position),'quaternion':[quaternion.x,quaternion.y,quaternion.z,quaternion.w],
    'scale':list(scale),'blenderMatrix':[list(row) for row in obj.matrix_world]}
assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
out=project/'vkPlacement.generated.json'
out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print('VK_PLACEMENT',json.dumps(result))
