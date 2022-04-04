import { isObject } from '../shared/index'
import {ShapeFlags} from '../shared/shapeFlags'

export function createVnode(type, props = {}, children?) {
    let vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlags(type)
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

function getShapeFlags(type) {
    if(typeof type === 'string') {
        return ShapeFlags.ELEMENT
    }else {
        return ShapeFlags.STATEFUL_COMPONENT
    }
}