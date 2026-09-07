
import './style.css';
import gsap from "gsap"
import ScrollTrigger from 'gsap/ScrollTrigger';
import "fpsmeter"

import Platform from './Platform';

gsap.registerPlugin(ScrollTrigger);


if(__get_mobileMode()){
    // console.log("***1");
    document.querySelector('#navigation')?.classList.add('hidden')
    //document.querySelector('#navigation_mobile').classList.remove('hidden')
}else{
    // console.log("***2");
    //document.querySelector('#navigation').classList.remove('hidden')
    document.querySelector('#navigation_mobile')?.classList.add('hidden')
}

console.log('secure', window.isSecureContext)
console.log('gpu', !!navigator.gpu)
console.log('shaderStage', !!globalThis.GPUShaderStage)

const adapter = await navigator.gpu?.requestAdapter()
console.log('adapter', adapter)


window.platform = new Platform()

const meter = new FPSMeter({
    position: 'fixed',
})

update_RAF()


function update_RAF(){
    //console.log("*");
    meter.tick()
    window.requestAnimationFrame( () =>{
        update_RAF()
    })
}


function __get_mobileMode(){
    const width = document.querySelector('#canvas_app').offsetWidth
    const breakpoint = 750
    let mobileMode = false
    if(width <= breakpoint){
        mobileMode = true
    }
    return mobileMode
}
