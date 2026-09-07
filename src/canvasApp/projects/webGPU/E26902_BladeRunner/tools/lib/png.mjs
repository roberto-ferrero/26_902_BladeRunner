// Minimal PNG reader shared by the phase 3 tools. Handles the subset the project actually
// contains: 8- and 16-bit greyscale, RGB, palette and alpha variants, no interlace.
import fs from 'node:fs'
import zlib from 'node:zlib'

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export function decodePNG(input) {
    const bytes = Buffer.isBuffer(input) ? input : fs.readFileSync(input)
    if (bytes.readUInt32BE(0) !== 0x89504e47) throw new Error('No es un PNG.')
    let offset = 8, header = null, palette = null
    const idat = []
    while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8)
        const data = bytes.subarray(offset + 8, offset + 8 + length)
        if (type === 'IHDR') header = {
            width: data.readUInt32BE(0), height: data.readUInt32BE(4),
            depth: data[8], colorType: data[9], interlace: data[12]
        }
        else if (type === 'PLTE') palette = data
        else if (type === 'IDAT') idat.push(data)
        else if (type === 'IEND') break
        offset += 12 + length
    }
    if (!header) throw new Error('PNG sin IHDR.')
    if (header.interlace !== 0) throw new Error('PNG entrelazado no soportado.')
    if (header.depth < 8) throw new Error(`Profundidad ${header.depth} no soportada.`)

    const channels = CHANNELS[header.colorType]
    const bytesPerSample = header.depth / 8
    const bpp = channels * bytesPerSample
    const stride = header.width * bpp
    const raw = zlib.inflateSync(Buffer.concat(idat))
    const out = Buffer.alloc(header.height * stride)
    let previous = Buffer.alloc(stride)
    for (let y = 0; y < header.height; y++) {
        const filter = raw[y * (stride + 1)]
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
        const row = out.subarray(y * stride, (y + 1) * stride)
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? row[x - bpp] : 0, b = previous[x], c = x >= bpp ? previous[x - bpp] : 0
            let value = line[x]
            if (filter === 1) value += a
            else if (filter === 2) value += b
            else if (filter === 3) value += (a + b) >> 1
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
                value += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
            }
            row[x] = value & 0xff
        }
        previous = row
    }

    // Normalise everything to RGBA floats in [0,1] so callers never branch on the layout.
    const maximum = header.depth === 16 ? 65535 : 255
    const pixels = new Float32Array(header.width * header.height * 4)
    for (let i = 0; i < header.width * header.height; i++) {
        const read = c => header.depth === 16
            ? out.readUInt16BE((i * channels + c) * 2) / maximum
            : out[i * channels + c] / maximum
        let r, g, b, a = 1
        if (header.colorType === 3) {
            const index = out[i] * 3
            r = palette[index] / 255; g = palette[index + 1] / 255; b = palette[index + 2] / 255
        } else if (header.colorType === 0) { r = g = b = read(0) }
        else if (header.colorType === 4) { r = g = b = read(0); a = read(1) }
        else { r = read(0); g = read(1); b = read(2); if (channels === 4) a = read(3) }
        pixels.set([r, g, b, a], i * 4)
    }
    return { width: header.width, height: header.height, depth: header.depth, colorType: header.colorType, pixels }
}

// Mean, extremes and spread per channel over an optional rectangle.
export function channelStats(image, rect) {
    const { x = 0, y = 0, width = image.width, height = image.height } = rect || {}
    const sums = [0, 0, 0, 0], mins = [1, 1, 1, 1], maxs = [0, 0, 0, 0]
    let count = 0
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            const index = (row * image.width + column) * 4
            for (let c = 0; c < 4; c++) {
                const value = image.pixels[index + c]
                sums[c] += value
                if (value < mins[c]) mins[c] = value
                if (value > maxs[c]) maxs[c] = value
            }
            count++
        }
    }
    return {
        pixels: count,
        mean: sums.map(s => +(s / count).toFixed(4)),
        min: mins.map(v => +v.toFixed(4)),
        max: maxs.map(v => +v.toFixed(4))
    }
}

export const srgbToLinear = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
export const linearToSrgb = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
export const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

// --- writing -----------------------------------------------------------------

function crc32(buffer) {
    let crc = ~0
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i]
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
    return ~crc >>> 0
}

function chunk(type, data) {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length, 0)
    head.write(type, 4, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
    return Buffer.concat([head, data, crc])
}

// 8-bit RGB, filter 0. Enough for review crops and contact sheets.
export function encodePNG({ width, height, pixels }) {
    const raw = Buffer.alloc(height * (width * 3 + 1))
    for (let y = 0; y < height; y++) {
        const row = y * (width * 3 + 1)
        raw[row] = 0
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < 3; c++) {
                raw[row + 1 + x * 3 + c] = Math.round(Math.min(1, Math.max(0, pixels[(y * width + x) * 4 + c])) * 255)
            }
        }
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4)
    header[8] = 8; header[9] = 2; header[10] = 0; header[11] = 0; header[12] = 0
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ])
}

// Nearest-neighbour crop and zoom, so a small detail can be judged without resampling blur.
export function crop(image, { x, y, width, height }, scale = 1) {
    const outWidth = width * scale, outHeight = height * scale
    const pixels = new Float32Array(outWidth * outHeight * 4)
    for (let row = 0; row < outHeight; row++) {
        for (let column = 0; column < outWidth; column++) {
            const source = ((y + Math.floor(row / scale)) * image.width + (x + Math.floor(column / scale))) * 4
            pixels.set(image.pixels.subarray(source, source + 4), (row * outWidth + column) * 4)
        }
    }
    return { width: outWidth, height: outHeight, pixels }
}

// Lays images out left to right with a separator, for a before/after sheet.
export function sideBySide(images, gap = 12, background = 0.08) {
    const width = images.reduce((n, i) => n + i.width, 0) + gap * (images.length - 1)
    const height = Math.max(...images.map(i => i.height))
    const pixels = new Float32Array(width * height * 4).fill(background)
    let offset = 0
    for (const image of images) {
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const source = (y * image.width + x) * 4
                pixels.set(image.pixels.subarray(source, source + 4), (y * width + offset + x) * 4)
            }
        }
        offset += image.width + gap
    }
    return { width, height, pixels }
}
