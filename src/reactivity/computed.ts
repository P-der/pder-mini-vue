import { ReactiveEffect } from "./effect"

class ComputedRefImpl {
    _getter: any
    _is_dirty: any
    _value: any = true
    _effect: any
    constructor(getter) {
        this._getter = getter
        this._is_dirty = true
        this._effect = new ReactiveEffect(getter, () => {
            this._is_dirty = true
        })
    }
    get value() {
        if(this._is_dirty) {
           this._value = this._effect.run()
           this._is_dirty = false
        } 
       return this._value
    }
}

export function computed(fn) {
    return new ComputedRefImpl(fn)
}