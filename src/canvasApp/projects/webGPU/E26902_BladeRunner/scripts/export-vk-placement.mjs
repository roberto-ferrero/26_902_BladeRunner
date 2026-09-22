import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

let blender = process.env.BLENDER_BIN
if (!blender && process.platform === 'win32') {
    const root = join(process.env.ProgramFiles || 'C:/Program Files', 'Blender Foundation')
    if (existsSync(root)) blender = readdirSync(root).filter(name => /^Blender \d/.test(name))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        .map(name => join(root, name, 'blender.exe')).find(existsSync)
}
const script = fileURLToPath(new URL('./export-vk-placement.py', import.meta.url))
const result = spawnSync(blender || 'blender', ['--background', '--disable-autoexec', '--python-exit-code', '1', '--python', script], { stdio: 'inherit' })
if (result.error) console.error('No se pudo iniciar Blender. Configura BLENDER_BIN.', result.error.message)
process.exit(result.status ?? 1)
