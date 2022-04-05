import { extend } from "../../shared/index"

let activeEffect
let targetMaps = new Map()
export class ReactiveEffect {
    activated: boolean = true
    deps = [] // set array
    onStop?: ()=> void
    constructor(public fn, public scheduler?) {
    }
    run() {
        activeEffect = this
        const res = this.fn()
        activeEffect = undefined // 需要重置
        return res
    }
    stop() {
        if(this.activated) {
            stopEffect(this)
            if(this.onStop) {
                this.onStop()
            }
            this.activated = false
        }
    }
}
function stopEffect(effect) {
    effect.deps.forEach(dep => {
        dep.delete(effect)
    });
    effect.deps.length = 0;
}

function getDep(target, key) {
    let deps = targetMaps.get(target) // map
    if(!deps) {
        deps = new Map()
        targetMaps.set(target, deps)
    }
    let dep = deps.get(key) // set
    if(!dep) {
        dep = new Set()
        deps.set(key, dep)
    }
    return dep
}
export function track(target, key) {
    if(!isTracking()) {
        return
    }
    let dep = getDep(target, key)
    trackEffect(dep)
}
export function isTracking() {
    return activeEffect !== undefined;
  }
export function trackEffect(dep) {
    if(!dep.has(activeEffect)) {
        dep.add(activeEffect)
        activeEffect.deps.push(dep)
    } 
}

export function trigger(target, key) {  
    let dep = getDep(target, key)
    triggerEffect(dep)
}

export function triggerEffect(dep) {
    if(!dep) {
        return
    }
    for( const effect of dep) {
        if(effect.scheduler) {
            effect.scheduler()
        }else {
            effect.run()
        }
    }
}

export function effect(fn, options:any = {}) {
    let _effect = new ReactiveEffect(fn)
    extend(_effect, options);
    _effect.run()
    const runner= _effect.run.bind(_effect) as any // fn
    runner.effect = _effect 

    return runner
}

export function stop(runner) {
    runner.effect.stop()
}