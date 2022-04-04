import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"
export function render(vnode, container) {
    patch(vnode, container)
}

function patch(vnode, container) {
    const {type} = vnode
    switch (type) {
        case Fragment:
            processFragment(vnode, container)
            break;
        case Text:
            processText(vnode, container)
            break;
        default:
            if(vnode.shapeFlag & ShapeFlags.ELEMENT) {
                processElement(vnode,container)
            }else if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
                processComponent(vnode, container)
            }
    }
   
}
function processText(vnode, container) {
    mountText(vnode, container)
}
function processFragment(vnode, container) {
    mountChildren(vnode.children, container)
}
function processComponent(vnode, container) {
    mountComponent(vnode, container)
}
function processElement(vnode, container) {
    mountElement(vnode, container)
}
function mountText(vnode, container) {
    let el = document.createTextNode(vnode.children)
    vnode.el = el
    container.append(el)
}
function mountElement(vnode, container) {
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
        mountChildren(children, el)
    }
    container.append(el)
}
function mountChildren(children, container) {
    children.forEach(v => {
        patch(v, container)
    })
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode)

    setupComponent(instance)

    setupRenderEffect(instance,initialVNode, container)
}
function setupRenderEffect(instance, initialVNode,container) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    patch(subTree, container)
    initialVNode.el = subTree.el
}