import { isObject } from "../shared/index"
import { isTracking, trackEffect, triggerEffect } from "./effect"
import { reactive } from "./reactive"
import { ReactiveFlags } from "./reactiveMap"

class RefImpl {
    _value
    _rawValue
    dep = new Set()
    constructor(value){
        this._rawValue = value
        this._value = convert(value)
        this.dep = new Set()
        this[ReactiveFlags.IS_REF] = true
    }
    get value() {
        if(isTracking()) {
            trackEffect(this.dep)
        }
        return this._value
    }
    set value(newValue) {
        if(newValue !== this._rawValue) {
            this._value = convert(newValue)
            this._rawValue = newValue
            triggerEffect(this.dep)
        }
    }
}

function convert(value) {
    if(isObject(value)) {
        return reactive(value)
    }
    return value
}
export function ref(target) {
    return new RefImpl(target)
}

export function isRef(target) {
    return !!target[ReactiveFlags.IS_REF]
}

export function unRef(target) {
    return isRef(target) ? target.value : target
}

export function proxyRefs(target) {
    return new Proxy(target, {
        get(target,key) {
            return unRef(Reflect.get(target, key))
        },
        set(target,key,value) {
            if(isRef(target[key]) && !isRef(value)) {
                return target[key].value = value
            }else {
                return Reflect.set(target, key, value)
            }
        }
    })
}