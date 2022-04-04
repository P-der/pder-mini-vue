import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"
export function render(vnode, container) {
    patch(vnode, container, null)
}

function patch(vnode, container, parentInstance) {
    const {type} = vnode
    switch (type) {
        case Fragment:
            processFragment(vnode, container, parentInstance)
            break;
        case Text:
            processText(vnode, container)
            break;
        default:
            if(vnode.shapeFlag & ShapeFlags.ELEMENT) {
                processElement(vnode,container, parentInstance)
            }else if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
                processComponent(vnode, container, parentInstance)
            }
    }
   
}
function processText(vnode, container) {
    mountText(vnode, container)
}
function processFragment(vnode, container, parentInstance) {
    mountChildren(vnode.children, container, parentInstance)
}
function processComponent(vnode, container, parentInstance) {
    mountComponent(vnode, container, parentInstance)
}
function processElement(vnode, container, parentInstance) {
    mountElement(vnode, container, parentInstance)
}
function mountText(vnode, container) {
    let el = document.createTextNode(vnode.children)
    vnode.el = el
    container.append(el)
}
function mountElement(vnode, container, parentInstance) {
    const {children, shapeFlag} = vnode
    let el = document.createElement(vnode.type)
    vnode.el = el
    let isOn = (key) => /^on[A-Z]/.test(key)
    // 处理props
    if(vnode.props) {
        for(const key in vnode.props) {
            if(isOn(key)) {
                let event = key.slice(2).toLowerCase()
                el.addEventListener(event, vnode.props[key])
            }else {
                el.setAttribute(key, vnode.props[key])
            }
        }
    }
    // 处理children
    if( shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.append(children)
    }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
        mountChildren(children, el, parentInstance)
    }
    container.append(el)
}
function mountChildren(children, container, parentInstance) {
    children.forEach(v => {
        patch(v, container,parentInstance )
    })
}
function mountComponent(initialVNode, container, parentInstance) {
    const instance = createComponentInstance(initialVNode, parentInstance)

    setupComponent(instance)

    setupRenderEffect(instance,initialVNode, container)
}
function setupRenderEffect(instance, initialVNode,container) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    patch(subTree, container, instance)
    initialVNode.el = subTree.el
}