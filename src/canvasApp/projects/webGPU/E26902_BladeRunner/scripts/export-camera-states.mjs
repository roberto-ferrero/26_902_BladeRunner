import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

let blender = process.env.BLENDER_BIN
if (!blender && process.platform === 'win32') {
    const root = join(process.env.ProgramFiles || 'C:/Program Files', 'Blender Foundation')
    if (existsSync(root)) {
        const versions = readdirSync(root).filter(name => /^Blender \d/.test(name))
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        blender = versions.map(name => join(root, name, 'blender.exe')).find(existsSync)
    }
}
const script = fileURLToPath(new URL('./export-camera-states.py', import.meta.url))
const result = spawnSync(blender || 'blender', ['--background', '--disable-autoexec', '--python-exit-code', '1',
    '--python', resolve(script), '--', ...process.argv.slice(2)], { stdio: 'inherit' })
if (result.error) console.error('No se pudo iniciar Blender. Configura BLENDER_BIN con la ruta al ejecutable.', result.error.message)
if (result.status !== 0) process.exit(result.status ?? 1)

// The default camera source is also the VK placement source. Keep their provenance
// and placement in sync when this command is run without custom export paths.
if (process.argv.length === 2) {
    const vkScript = fileURLToPath(new URL('./export-vk-placement.py', import.meta.url))
    const vk = spawnSync(blender || 'blender', ['--background', '--disable-autoexec', '--python-exit-code', '1',
        '--python', vkScript], { stdio: 'inherit' })
    if (vk.error) console.error('No se pudo actualizar la posición del Voight-Kampff.', vk.error.message)
    process.exit(vk.status ?? 1)
}
