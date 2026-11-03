// npm run deploy            builds, uploads what differs from the live site and verifies it.
// npm run deploy -- --dry-run   only lists what would be uploaded; needs no access.
// The FTP access lives outside the repo, in a netrc file only curl reads (~/.robertoferrero-ftp.netrc).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://www.robertoferrero.es/'
const FTP = 'ftp://ftp.robertoferrero.es/www.robertoferrero.es/'
const NETRC = join(homedir(), '.robertoferrero-ftp.netrc')
const TEXT = new Set(['.html', '.css', '.json', '.txt', '.map'])
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(repo, 'dist')
const dryRun = process.argv.includes('--dry-run')
const url = rel => SITE + rel.split('/').map(encodeURIComponent).join('/')
const md5 = buffer => createHash('md5').update(buffer).digest('hex')
// FTP text mode may have changed the line endings of files already on the server.
const normalized = buffer => Buffer.from(buffer.toString('latin1').replaceAll('\r', ''), 'latin1')

function walk(directory, files = []) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) walk(path, files)
        else files.push(path)
    }
    return files
}

async function differs(path, rel) {
    if (TEXT.has(extname(path))) {
        const response = await fetch(url(rel), { cache: 'no-store' })
        if (response.status === 404) return true
        if (!response.ok) throw new Error(`${rel}: HTTP ${response.status}`)
        return md5(normalized(Buffer.from(await response.arrayBuffer()))) !== md5(normalized(readFileSync(path)))
    }
    const response = await fetch(url(rel), { method: 'HEAD', cache: 'no-store' })
    if (response.status === 404) return true
    if (!response.ok) throw new Error(`${rel}: HTTP ${response.status}`)
    return Number(response.headers.get('content-length')) !== statSync(path).size
}

async function changedFiles() {
    const files = walk(dist), changed = []
    let next = 0
    await Promise.all(Array.from({ length: 8 }, async () => {
        while (next < files.length) {
            const path = files[next++], rel = relative(dist, path).split(sep).join('/')
            if (await differs(path, rel)) changed.push({ path, rel, size: statSync(path).size })
        }
    }))
    // index.html last: it must never point at a bundle that is not on the server yet.
    return changed.sort((a, b) => (a.rel === 'index.html') - (b.rel === 'index.html') || a.rel.localeCompare(b.rel))
}

function curl(args) {
    const result = spawnSync('curl.exe', ['--ssl', '--netrc-file', NETRC, '--silent', '--show-error', ...args], { encoding: 'utf8' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`curl (${result.status}): ${result.stderr.trim()}`)
}

const liveBundle = name => name?.match(/bundle\.[0-9a-f]+\.js/)?.[0]

if (!dryRun && !existsSync(NETRC)) throw new Error(`Falta el acceso FTP en ${NETRC}`)
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: repo, stdio: 'inherit', shell: process.platform === 'win32' })
if (build.status !== 0) throw new Error('El build ha fallado: no se sube nada.')
const previous = liveBundle(await (await fetch(url('index.html'), { cache: 'no-store' })).text())
const changed = await changedFiles()
console.log(changed.length ? `Por subir (${(changed.reduce((n, file) => n + file.size, 0) / 1e6).toFixed(1)} MB):` : 'La web ya está al día.')
for (const file of changed) console.log(`  ${file.rel}`)
if (dryRun || !changed.length) process.exit(0)
for (const file of changed) {
    console.log(`Subiendo ${file.rel}`)
    curl(['--ftp-create-dirs', '-T', file.path, FTP + file.rel.split('/').map(encodeURIComponent).join('/')])
}
const pending = await changedFiles()
if (pending.length) throw new Error(`Subido, pero la web aún no coincide en: ${pending.map(file => file.rel).join(', ')}`)
const current = liveBundle(readFileSync(join(dist, 'index.html'), 'utf8'))
if (previous && previous !== current) {
    for (const name of [previous, `${previous}.map`, `${previous}.LICENSE.txt`]) {
        try { curl(['-o', process.platform === 'win32' ? 'NUL' : '/dev/null', FTP, '-Q', `DELE www.robertoferrero.es/portfolio/${name}`]) }
        catch (error) { console.warn(`No se pudo borrar ${name}: ${error.message}`) }
    }
}
console.log('Publicado y comprobado:', SITE)
