import { Vector3 } from 'three'
import { TYRELL } from './config'

// Reversible first lighting composition. No shader, texture or geometry replacement.
export default class TyrellLighting {
    constructor(root, sun, fill, areas) {
        this.root = root; this.sun = sun; this.fill = fill; this.areas = areas
        root.updateMatrixWorld(true)
        // GLTFLoader parents the target to the light. Keep it independent when quality replaces the light.
        root.attach(sun.target)
        this.original = { position: sun.position.clone(), target: sun.target.position.clone(),
            color: sun.color.clone(), intensity: sun.intensity, hemisphere: fill.intensity,
            areas: areas.map(light => light.intensity) }
        root.traverse(object => {
            if (object.isMesh && object.name.startsWith('Sol')) this.disc = object
            if (object.isMesh && object.name.startsWith('Cielo')) this.sky = object
        })
        if (!this.disc || !this.sky) throw new Error('Falta el disco solar o el cielo de referencia.')
        this.original.discPosition = this.disc.position.clone()
        this.original.discScale = this.disc.scale.clone()
        this.original.skyEmission = this.sky.material.emissive.clone()
    }
    apply(profile) {
        if (!['provisional', 'tyrell-light-v1', 'tyrell-light-v2'].includes(profile)) return
        this.profile = profile
        const o = this.original, p = TYRELL.lighting
        this.sun.position.copy(o.position); this.sun.target.position.copy(o.target)
        this.sun.color.copy(o.color); this.sun.intensity = o.intensity
        this.fill.intensity = o.hemisphere
        this.areas.forEach((light, i) => { light.intensity = o.areas[i] })
        this.disc.position.copy(o.discPosition); this.disc.scale.copy(o.discScale)
        this.sky.material.emissive.copy(o.skyEmission)
        if (profile !== 'provisional') {
            const center = new Vector3(...p.target), disc = new Vector3(...p.discPosition)
            const direction = disc.clone().sub(center).normalize()
            this.sun.position.copy(this.sun.parent.worldToLocal(center.clone().addScaledVector(direction, p.shadowDistance)))
            this.sun.target.position.copy(this.sun.target.parent.worldToLocal(center.clone()))
            this.disc.position.copy(this.disc.parent.worldToLocal(disc))
            this.disc.scale.copy(o.discScale).multiplyScalar(p.discScale)
            this.sun.color.setHex(p.sunColor); this.sun.intensity = p.sunIntensity
            this.fill.intensity = p.hemisphereIntensity
            this.areas.forEach((light, i) => { light.intensity = p.areaIntensities[i] })
            this.sky.material.emissive.copy(o.skyEmission).multiplyScalar(p.skyEmissionScale)
        }
        if (profile === 'tyrell-light-v2') {
            const calibrated = TYRELL.calibratedLighting
            this.sun.intensity = calibrated.sunIntensity
            this.fill.intensity = calibrated.hemisphereIntensity
            this.areas.forEach((light, i) => { light.intensity = calibrated.areaIntensities[i] })
        }
        const contribution = this.contribution || 'all'
        if (contribution !== 'all') {
            if (contribution !== 'sun') this.sun.intensity = 0
            if (contribution !== 'hemisphere') this.fill.intensity = 0
            this.areas.forEach((light, i) => {
                if (contribution !== 'areas' && contribution !== `area-${i}`) light.intensity = 0
            })
        }
        this.root.updateMatrixWorld(true)
    }
    setContribution(value) {
        if (!['all', 'sun', 'hemisphere', 'areas', 'area-0', 'area-1', 'area-2', 'area-3'].includes(value)) return
        this.contribution = value
        this.apply(this.profile)
    }
    diagnostics() {
        const position = this.sun.getWorldPosition(new Vector3()), target = this.sun.target.getWorldPosition(new Vector3())
        return { profile: this.profile, contribution: this.contribution || 'all', sunPosition: position.toArray(), target: target.toArray(),
            directionToSun: position.sub(target).normalize().toArray(), sunIntensity: this.sun.intensity,
            sunColor: this.sun.color.getHexString(), discPosition: this.disc.getWorldPosition(new Vector3()).toArray(),
            discScale: this.disc.scale.toArray(), skyEmission: this.sky.material.emissive.toArray(),
            hemisphereIntensity: this.fill.intensity, areaIntensities: this.areas.map(light => light.intensity) }
    }
}
