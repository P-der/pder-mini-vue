import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots";
let currentInstance = null
export function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        setupState: {},
        emit: ()=> {},
        slots: {}, // 存放插槽的数据
    }
    instance.emit = emit.bind(null, instance) as any;
    return instance
}

export function setupComponent(instance) {
    // init props
    initProps(instance, instance.vnode.props)
    // init slots
    initSlots(instance, instance.vnode.children)
    
    setupStatefulComponent(instance)
}
function setupStatefulComponent(instance) {
    const component = instance.type // 原始对象
    instance.proxy = new Proxy({_:instance}, PublicInstanceProxyHandlers)
    const { setup } = component;
    if(setup) {
        setCurrentInstance(instance)

        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        })
        setCurrentInstance(null)

        handleSetupResult(instance, setupResult)
    }
}
function handleSetupResult(instance, setupResult) {
    if(typeof setupResult === 'function') {
        instance.render = setupResult
    }
    if(typeof setupResult === 'object') {
        instance.setupState = setupResult
    }
    finishComponentSetup(instance)
}
function finishComponentSetup(instance) {
    const component = instance.type
    if(!instance.render) {
        instance.render = component.render
    }
}
export function getCurrentInstance() {
    return currentInstance
}
function setCurrentInstance(instance) {
    currentInstance = instance
}