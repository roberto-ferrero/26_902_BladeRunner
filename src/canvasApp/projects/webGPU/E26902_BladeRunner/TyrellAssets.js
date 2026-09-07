import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export async function loadTyrell(url, signal, onProgress) {
    const start = performance.now()
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`No se pudo cargar el GLB (HTTP ${response.status}).`)
    const total = Number(response.headers.get('content-length')) || 0
    let buffer
    if (response.body) {
        const reader = response.body.getReader()
        const chunks = []
        let received = 0
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            received += value.byteLength
            onProgress(received, total)
        }
        const bytes = new Uint8Array(received)
        let offset = 0
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
        buffer = bytes.buffer
    } else {
        buffer = await response.arrayBuffer()
        onProgress(buffer.byteLength, total)
    }
    signal.throwIfAborted()
    if (buffer.byteLength < 12 || new DataView(buffer).getUint32(0, true) !== 0x46546c67) {
        throw new Error('La respuesta no es un GLB válido. Comprueba la ruta del recurso.')
    }
    onProgress(buffer.byteLength, buffer.byteLength, true)
    const gltf = await new GLTFLoader().parseAsync(buffer, new URL('.', url).href)
    if (signal.aborted) {
        disposeScene(gltf.scene)
        signal.throwIfAborted()
    }
    return { gltf, bytes: buffer.byteLength, loadMs: performance.now() - start }
}

// Shared chair geometry/materials and embedded ImageBitmaps are released once.
export function disposeScene(root) {
    if (!root) return
    const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set()
    root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry)
        for (const material of [].concat(object.material || [])) materials.add(material)
        if (object.isLight) object.dispose?.()
    })
    for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
        material.dispose()
    }
    for (const texture of textures) {
        if (texture.source?.data) images.add(texture.source.data)
        texture.dispose()
    }
    for (const image of images) image.close?.()
    for (const geometry of geometries) geometry.dispose()
    root.removeFromParent()
}
