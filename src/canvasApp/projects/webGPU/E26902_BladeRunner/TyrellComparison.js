// A bounded, immutable record of measured configurations; never a GPU benchmark.
export default class TyrellComparison {
    constructor() { this.rows = []; this.nextId = 1 }
    add(report) {
        if (!report.metrics || report.metrics.samples < 120) throw new Error('Faltan muestras estables.')
        const keys = ['qualityBudget', 'performance', 'loading', 'adapter', 'asset', 'date', 'quality', 'camera', 'cameraPan', 'exposure', 'metrics', 'floorReflection', 'specularEnvironment', 'atmosphere', 'lightVolume', 'postProcessing', 'sky', 'lighting', 'materialLook', 'indirect', 'reviewLighting']
        keys.push('city', 'buildingLights', 'airTraffic', 'nearTraffic', 'flames', 'voightKampff')
        const row = JSON.parse(JSON.stringify(Object.fromEntries(keys.map(key => [key, report[key]]))))
        row.id = this.nextId++
        row.effects = [
            [row.voightKampff, `VK ${({ closed: 'cerrado', open: 'operativo', deploying: 'desplegando', retracting: 'replegando' })[row.voightKampff?.state] || ''}`],
            [row.specularEnvironment?.minimumCaptureInterval > 0, 'Reflejos a 2 Hz'],
            [row.city?.enabled, 'Edificios bajos'],
            [row.buildingLights?.intensity > 0, 'Luces de edificios'],
            [row.buildingLights?.beacons > 0, 'Balizas'],
            [row.airTraffic?.enabled && row.airTraffic?.density > 0, 'Tráfico lejano'],
            [row.nearTraffic?.enabled, 'Tráfico cercano'],
            [row.flames?.visible && row.flames?.intensity > 0, 'Llamaradas'],
            [row.floorReflection?.enabled, 'Suelo'], [row.specularEnvironment?.enabled, 'Metal/vidrio'],
            [row.atmosphere?.exterior, 'Exterior'], [row.atmosphere?.interior, 'Bruma'],
            [row.lightVolume?.enabled, 'Haces'], [row.lightVolume?.enabled && row.lightVolume?.dust && row.lightVolume?.speed > 0, 'Polvo animado'],
            [row.postProcessing?.bloom, 'Bloom'], [row.postProcessing?.grade, 'Color'], [row.postProcessing?.flare?.enabled && row.postProcessing.flare.intensity > 0, 'Lens flare']
        ].filter(([enabled]) => enabled).map(([, name]) => name).join(', ') || 'Sin efectos'
        this.rows.push(row)
        if (this.rows.length > 12) this.rows.shift()
        return row
    }
    clear() { this.rows = [] }
}
