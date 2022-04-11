import { isObject } from '../shared/index'
import {ShapeFlags} from '../shared/shapeFlags'
export const Text = Symbol("Text");
export const Fragment = Symbol('Fragment')
export function createVnode(type, props?, children?) {
    let vnode = {
        type,
        props,
        children,
        el: null,
        key: props && props.key,
        shapeFlag: getShapeFlags(type),
        component: null
    }
    if(typeof vnode.children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }else if(Array.isArray(vnode.children)){
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }

    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT && isObject(vnode.children)) {
        vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
    return vnode
}

export function createTextVnode(children) {
    return createVnode(Text, {} , children)
}

function getShapeFlags(type) {
    if(typeof type === 'string') {
        return ShapeFlags.ELEMENT
    }else {
        return ShapeFlags.STATEFUL_COMPONENT
    }
}
export { createVnode as createElementVNode };