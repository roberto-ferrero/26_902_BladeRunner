//import gsap from "gsap"
import * as THREE from 'three'
import GPUProfiler from './utils/GPUProfiler';
// import GPUProfiler2 from './utils/GPUProfiler2';

class AppRender{
    constructor (obj){
        // console.log("(AppRender.CONSTRUCTOR): ", obj)
        this.app = obj.app
        //------
        this.render_background_color = this.app.render_background_color ?? 0xffffff
        this.render_background_alpha = this.app.render_background_alpha ?? 1
        //------
        this.devCamera = this.app.dev.get_devCamera()
        this.stageCamera = null
        //------
        this.RENDER_COUNT = 0
        this.performanceData = this._getDefaultPerformanceData()
        this.policy = this.app.project?.rendererOptions || {}
        this.app.emitter.on('onAppKill', () => this.dispose())
        //----------------------
        // SCENE:
        this.scene = new THREE.Scene();
        this.scene.add(this.devCamera)
        //----------------------
        this.init()
        
    }
    //----------------------------------------------
    // UPDATE:
    update_RAF(){
        if(this.disposed || !this.renderer) return
        const active_camera = this.get_activeCamera()
        if(this.app.TYPE == "WEBGPU_APP" && !this.renderer?.initialized){
            return
        }
        this.renderer.render( this.scene, active_camera);
        this.RENDER_COUNT++
    }
    //----------------------------------------------
    // PUBLIC:
    init(){
        if(this.app.TYPE == "WEBGL_APP"){
            this._init_webglRenderer()
        }else if(this.app.TYPE == "WEBGPU_APP"){
            this._ensureWebGPUConstants()
            if(this._canUseWebGPU()){
                this._init_webgpuRenderer()
            }else{
                this._rendererFailed(new Error('WebGPU no está disponible. Abre el proyecto en localhost o HTTPS con un navegador y una GPU compatibles.'))
            }
        }
        if(this.app.GUI_MODE) this.app.dev.gui.add(this.app, 'TYPE').name('RENDERER:');
    }
    _init_webglRenderer(){
        // console.log("(AppRender._init_webglRenderer)!");
        // console.log("this.app.$container: ", this.app.$container);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            precision: "highp", // "highp", "mediump", // "lowp" 
            alpha: true,
            sortObjects: true
        });
        //-
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
        this.renderer.setClearColor(this.render_background_color, this.render_background_alpha )
        this.renderer.setSize( this.app.size.CURRENT.width, this.app.size.CURRENT.height );
        //--
        this.app.$container.appendChild(this.renderer.domElement)
        this.app.emitter.emit('onRendererReady', {})

    }
    async _init_webgpuRenderer(){
        try{
            this.app.project?.onRendererProgress?.(this.app)
            const { WebGPURenderer } = await import('three/webgpu')
            if(this.disposed) return

            this.renderer = new WebGPURenderer({
                antialias: true,
                alpha: true,
                powerPreference: this.policy.powerPreference || 'high-performance'
            });
            //-
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
            this.renderer.setClearColor(this.render_background_color, this.render_background_alpha)
            this.renderer.setSize(this.app.size.CURRENT.width, this.app.size.CURRENT.height)
            //--
            this.app.$container.appendChild(this.renderer.domElement)
            await this.renderer.init()
            if(this.disposed) { this.renderer.dispose(); return }
            if(this.policy.requireWebGPU && this.renderer.backend?.isWebGPUBackend !== true){
                throw new Error('El navegador ha seleccionado WebGL. Tyrell requiere un backend WebGPU real.')
            }
            // Profiling failure must never discard a successfully initialized renderer.
            if(this.policy.benchmarkOnStart !== false) {
              try {
            this.profiler = new GPUProfiler({ renderer: this.renderer, ringSize: 6, warmupRuns: 5 });
            this.profiler.init();

            const runQuickScore = async () => {
                // Choose work so mid GPUs take a few ms (tune these two numbers).
                const stats = await this.profiler.benchmarkComputeStats({
                    runs: 30,
                    workgroups: 8192,     // dispatchWorkgroups
                    iterations: 2048,     // inner loop
                    workgroupSize: 256,
                });

                const score = GPUProfiler.scoreFromStats(stats);
                this.performanceData = this._buildPerformanceData(stats, score);
                console.log("GPU benchmark stats:", stats);
                console.log("Relative score:", score);
                console.log("GPU performance tier:", this.performanceData.tier);

            }
            await runQuickScore().catch((error)=>{
                console.error("(AppRender._init_webgpuRenderer) benchmark error:", error)
            })
              } catch(error) { console.warn('(AppRender) GPU profiler unavailable:', error) }
            }
            if(this.disposed) return
            this.app.emitter.emit('onRendererReady', {})

        }catch(error){
            this._rendererFailed(error)
        }
    }
    _rendererFailed(error){
        if(this.disposed) return
        console.error('(AppRender) init error:', error)
        if(this.renderer?.initialized) this.renderer.dispose()
        this.renderer?.domElement.remove()
        this.renderer = null
        if(this.policy.requireWebGPU){
            this.app.project?.onRendererError?.(error, this.app)
            this.app.emitter.emit('onRendererError', { error })
        }else{
            this.app.TYPE = 'WEBGL_APP'
            this._init_webglRenderer()
        }
    }
    dispose(){
        this.disposed = true
        this.profiler?.dispose?.()
        if(this.renderer?.initialized || this.renderer?.isWebGLRenderer) this.renderer.dispose()
        this.renderer?.domElement.remove()
    }
    _canUseWebGPU(){
        if(typeof globalThis === "undefined" || typeof navigator === "undefined"){
            return false
        }
        return Boolean(
            globalThis.isSecureContext &&
            navigator.gpu &&
            typeof navigator.gpu.requestAdapter === "function"
        )
    }
    _ensureWebGPUConstants(){
        if(typeof globalThis === "undefined"){
            return
        }
        globalThis.GPUShaderStage ||= {
            VERTEX: 1,
            FRAGMENT: 2,
            COMPUTE: 4
        }
    }
    _getDefaultPerformanceData(){
        return {
            tier: "Mid",
            score: 0,
            supported: false,
            benchmarked: false
        }
    }
    _buildPerformanceData(stats, score){
        const safeScore = Number.isFinite(score) ? score : 0
        let tier = "Mid"

        if(stats?.supported){
            if(safeScore < 5e7){
                tier = "Low"
            }else if(safeScore >= 1.5e8){
                tier = "High"
            }
        }

        return {
            tier,
            score: safeScore,
            supported: Boolean(stats?.supported),
            benchmarked: true,
            stats
        }
    }
    
    update_resize(){
        if(!this.renderer){
            return
        }
        this.renderer.setSize( this.app.size.CURRENT.width, this.app.size.CURRENT.height );
    }
    get_activeCamera(){
        if(!this.app.dev.SHOW_DEV_CAMERA && this.stageCamera){
            return this.stageCamera
        }else{
            return this.devCamera 
        }
    }
    set_stageCamera(stageCamera){
        this.stageCamera = stageCamera
    }
    //----------------------------------------------
    // EVENTS:

    //----------------------------------------------
    // PRIVATE:

    //----------------------------------------------
    // AUX:

  
}
export default AppRender
