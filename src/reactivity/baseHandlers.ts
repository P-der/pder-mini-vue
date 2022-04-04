import { isObject } from "../shared/index"
import { track, trigger } from "./effect"
import { readonly, reactive } from "./reactive"
import { ReactiveFlags } from './reactiveMap'
function createGetter(isReadonly = false, isShallow = false) {
    return function (target, key) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        let res = Reflect.get(target, key)
        
        if (!isReadonly) {
            track(target, key)
        }

        if(!isShallow && isObject(res)) {
           return isReadonly? readonly(res): reactive(res)
        }else {
            return res
        }
    }
}

function createSetter(isReadonly = false) {
    return function (target, key, value) {
        let res = Reflect.set(target, key, value)
        if (!isReadonly) {
            trigger(target, key)
        }
        return res
    }
}


const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const readonlySet = function (target, key, value) {
    console.warn('readonly/shallowReadonly 不允许修改')
    return true
}
const shallowReadonlyGet = createGetter(true, true)
export const readonlyHandlers = {
    get: readonlyGet,
    set: readonlySet
}
export const mutableHandlers = {
    get,
    set,
}
export const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set: readonlySet
}

