import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"

export function render(vnode, container) {
    patch(vnode, container)
}

function patch(vnode, container) {
    if(vnode.shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode,container)
    }else if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
        processComponent(vnode, container)
    }
}
function processComponent(vnode, container) {
    mountComponent(vnode, container)
}
function processElement(vnode, container) {
    mountElement(vnode, container)
}
function mountElement(vnode, container) {
    let el = document.createElement(vnode.type)
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
    mountChildren(vnode, el)
    container.append(el)
    vnode.el = el
}
function mountChildren({children, shapeFlag}, container) {
    if(!children) {
        return
    }
    if( shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.innerText = children
    }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
        children.forEach(v => {
            patch(v, container)
        })
    }
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