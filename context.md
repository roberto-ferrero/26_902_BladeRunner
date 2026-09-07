## Architecture Description

This project is a modular Three.js canvas application bundled with Webpack. The runtime starts in `src/script.js`, which loads global styles, registers GSAP `ScrollTrigger`, detects a basic mobile layout mode, creates a `Platform` instance, and starts a lightweight FPS meter loop.

`src/Platform.js` is the application composition layer. It wires DOM containers to `CanvasApp`, selects the active project (`SampleWebGLProj`), enables optional development features, and connects page scroll progress to the canvas runtime through GSAP `ScrollTrigger`.

`src/canvasApp/core/CanvasApp.js` is the central orchestrator. It owns shared services and lifecycle state, including:
- `AppState` for runtime flags and readiness
- `AppSize` for responsive sizing
- `AppDev` for debug and helper tooling
- `AppRender` for Three.js scene, camera, and renderer updates
- `AppLoaders` and loader libraries for asset ingestion
- `AppScrolls` for normalized scroll state

`CanvasApp` also manages the render loop with `requestAnimationFrame`, updates timing through `THREE.Clock`, propagates per-frame updates to subsystems, and exposes an event-driven lifecycle using Node's `EventEmitter`.

The project-specific logic lives under `src/canvasApp/projects/`. The current implementation, `SampleWebGLProj`, acts as a minimal scene module: it receives the app instance, builds a `StageOrtoCamera`, attaches it to the renderer, and signals when the project is ready. This separation allows the core app shell to stay generic while each project defines its own scene setup and frame behavior.

Supporting modules are split by responsibility:
- `core/cameras` contains reusable camera abstractions
- `core/loaders` contains specialized asset loaders such as GLTF, HDR, JSON, textures, and video
- `core/utils` contains shared utility classes and data helpers

The build system is defined in `bundler/` with separate common, development, and production Webpack configurations. Static assets are served from `static/`, source files live in `src/`, and production output is generated in `dist/`.
