import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { reflector, float, pow, saturate, dot, positionViewDirection, transformedNormalView, materialRoughness } from 'three/tsl'
import { TYRELL } from './config'

// The planar reflection of the pavement.
//
// The 21 floor sectors share one material, "PBR | Piedra negra pulida", so a single reflector
// serves the whole floor: one extra pass, not twenty-one. Its plane comes from the sectors
// themselves rather than from a number typed here.
//
// Where the reflection is added matters. It goes into the emissive slot, which is added after the
// BRDF and is not multiplied by any light term. That is the physically right place for a mirror:
// a polished floor standing in shadow still reflects what is in front of it. Mixing it into the
// base colour instead, which is the usual shortcut, would let the direct lighting modulate the
// reflection and make it vanish exactly where the reference shows it strongest.
//
// It is not a uniform mirror either. Three things shape it, and all three come from the material
// the model already carries:
//   Fresnel   Schlick against the shading normal, so the reflection is faint head-on and takes
//             over at grazing angles, which is what draws the long streaks down the hall.
//   Roughness the material's own roughness map picks the blur, so the worn patches scatter and
//             the polished ones stay sharp.
//   Normals   the shading normal already includes the normal map, so the joints break the
//             reflection where the stone is cut.

const _box = new THREE.Box3()
const _meshBox = new THREE.Box3()

/**
 * Builds the floor reflector and swaps the floor material for a node material that uses it.
 *
 * The material is replaced, not cloned per mesh: every sector keeps pointing at one instance.
 * Returns what it did, plus the way to undo it, because the render target it allocates outlives
 * the call.
 */
export function createFloorReflection({ scene, meshes }) {
    const settings = TYRELL.reflection
    if (!settings.enabled || !meshes.length) return null

    // The plane sits on top of the pavement, taken from the sectors themselves.
    _box.makeEmpty()
    for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false)
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        _meshBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
        _box.union(_meshBox)
    }
    const height = _box.max.y
    const centre = _box.getCenter(new THREE.Vector3())

    const reflection = reflector({
        resolutionScale: settings.resolutionScale,
        // No recursion: the reflection must not render other reflectors, and with bounces off
        // Three also drops the reflector from once-per-render to once-per-frame.
        bounces: false,
        generateMipmaps: true,
        samples: settings.samples
    })
    // A reflector takes its plane normal from its target's own +Z, so the target is laid flat.
    reflection.target.rotation.x = -Math.PI / 2
    reflection.target.position.set(centre.x, height, centre.z)
    reflection.target.name = 'Tyrell / plano del reflejo'
    reflection.target.updateMatrixWorld(true)
    scene.add(reflection.target)

    const source = meshes[0].material
    const material = new MeshStandardNodeMaterial()
    material.copy(source)
    material.name = source.name

    const cosTheta = saturate(dot(transformedNormalView, positionViewDirection))
    const f0 = float(settings.reflectivity)
    const fresnel = f0.add(float(1).sub(f0).mul(pow(float(1).sub(cosTheta), 5)))
    const blurred = reflection.blur(materialRoughness.mul(settings.roughnessBlur))
    material.emissiveNode = blurred.rgb.mul(fresnel).mul(settings.strength)

    for (const mesh of meshes) mesh.material = material

    return {
        planeY: +height.toFixed(4), centre: centre.toArray().map(v => +v.toFixed(3)),
        sectors: meshes.length, sharedMaterials: 1,
        resolutionScale: settings.resolutionScale, samples: settings.samples,
        reflectivity: settings.reflectivity, roughnessBlur: settings.roughnessBlur,
        strength: settings.strength, bounces: false,
        dispose: () => {
            reflection.target.removeFromParent()
            for (const mesh of meshes) mesh.material = source
            material.dispose()
            reflection.reflectorNode?.dispose?.()
        },
        restore: () => { for (const mesh of meshes) mesh.material = source },
        apply: () => { for (const mesh of meshes) mesh.material = material }
    }
}
