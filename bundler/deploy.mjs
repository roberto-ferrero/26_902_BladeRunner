// npm run deploy            builds, uploads what differs in dist/portfolio/ and verifies it.
// index.html is uploaded by hand: with fixed bundle names it does not change between versions.
// npm run deploy -- --dry-run   only lists what would be uploaded; needs no access.
// The FTP access lives outside the repo, in a netrc file only curl reads (~/.robertoferrero-ftp.netrc).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://www.robertoferrero.es/'
const FTP = 'ftp://ftp.robertoferrero.es/'
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
    // The web server does not serve .htaccess: it cannot be compared, it is handled apart.
    if (rel.endsWith('/.htaccess')) return false
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
    const files = walk(join(dist, 'portfolio')), changed = []
    let next = 0
    await Promise.all(Array.from({ length: 8 }, async () => {
        while (next < files.length) {
            const path = files[next++], rel = relative(dist, path).split(sep).join('/')
            if (await differs(path, rel)) changed.push({ path, rel, size: statSync(path).size })
        }
    }))
    return changed.sort((a, b) => a.rel.localeCompare(b.rel))
}

function curl(args) {
    const result = spawnSync('curl.exe', ['--ssl', '--netrc-file', NETRC, '--silent', '--show-error', ...args], { encoding: 'utf8' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`curl (${result.status}): ${result.stderr.trim()}`)
}

if (!dryRun && !existsSync(NETRC)) throw new Error(`Falta el acceso FTP en ${NETRC}`)
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: repo, stdio: 'inherit', shell: process.platform === 'win32' })
if (build.status !== 0) throw new Error('El build ha fallado: no se sube nada.')
const changed = await changedFiles()
console.log(changed.length ? `Por subir (${(changed.reduce((n, file) => n + file.size, 0) / 1e6).toFixed(1)} MB):` : 'dist/portfolio ya está al día en la web.')
for (const file of changed) console.log(`  ${file.rel}`)
const liveIndex = await (await fetch(url('index.html'), { cache: 'no-store' })).text()
const indexChanged = normalized(Buffer.from(liveIndex)).toString() !== normalized(readFileSync(join(dist, 'index.html'))).toString()
const warnIndex = () => { if (indexChanged) console.log('AVISO: index.html ha cambiado. Súbelo a mano desde dist/index.html.') }
if (dryRun) { warnIndex(); process.exit(0) }
// Find the web portfolio folder on the account: its root, or a folder called portfolio inside it.
function listing(path) {
    const result = spawnSync('curl.exe', ['--ssl', '--netrc-file', NETRC, '--silent', '--show-error', '--list-only', FTP + path], { encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`No se pudo listar el FTP: ${result.stderr.trim()}`)
    return result.stdout.split(String.fromCharCode(10)).map(line => line.trim())
}
const prefix = listing('').includes('glbs') ? '' : listing('portfolio/').includes('glbs') ? 'portfolio/' : null
if (prefix === null) throw new Error('No encuentro la carpeta del portfolio en el FTP: no se sube nada.')
const remote = rel => FTP + prefix + rel.slice('portfolio/'.length).split('/').map(encodeURIComponent).join('/')
for (const file of changed) {
    console.log(`Subiendo ${file.rel}`)
    curl(['--ftp-create-dirs', '-T', file.path, remote(file.rel)])
}
const pending = await changedFiles()
if (pending.length) throw new Error(`Subido, pero la web aún no coincide en: ${pending.map(file => file.rel).join(', ')}`)
// .htaccess last and checked: a host that forbids these directives answers 500 and it is removed at once.
curl(['--ftp-create-dirs', '-T', join(dist, 'portfolio', '.htaccess'), remote('portfolio/.htaccess')])
const check = await fetch(url('portfolio/main.css'), { method: 'HEAD', cache: 'no-store' })
if (!check.ok) {
    curl(['-o', 'NUL', FTP + prefix, '-Q', `DELE ${prefix}.htaccess`])
    throw new Error(`.htaccess rechazado por el servidor (HTTP ${check.status}): retirado. Sin él, el navegador puede tardar en ver cada versión.`)
}
console.log(`Caché: ${check.headers.get('cache-control') || 'sin Cache-Control (mod_headers no activo)'}`)
warnIndex()
console.log('Publicado y comprobado:', SITE)
