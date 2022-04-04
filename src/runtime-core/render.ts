import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp";
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        patchProp: hostPatchProp,
        insert: hostInsert,
        createText: hostCreateText,
    } = options;
    function render(vnode, container) {
        patch(vnode, container, null)
    }
    function patch(vnode, container, parentInstance) {
        const { type } = vnode
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentInstance)
                break;
            case Text:
                processText(vnode, container)
                break;
            default:
                if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(vnode, container, parentInstance)
                } else if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
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
        let el = hostCreateText(vnode.children)
        vnode.el = el
        hostInsert(el, container)
    }
    function mountElement(vnode, container, parentInstance) {
        const { children, shapeFlag, props } = vnode
        let el = hostCreateElement(vnode.type)
        vnode.el = el
        // 处理props
        if (props) {
            for (const key in props) {
                const value = props[key];
                hostPatchProp(el, key, value);
            }
        }
        // 处理children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el, parentInstance)
        }
        hostInsert(el, container)
    }
    function mountChildren(children, container, parentInstance) {
        children.forEach(v => {
            patch(v, container, parentInstance)
        })
    }
    function mountComponent(initialVNode, container, parentInstance) {
        const instance = createComponentInstance(initialVNode, parentInstance)

        setupComponent(instance)

        setupRenderEffect(instance, initialVNode, container)
    }
    function setupRenderEffect(instance, initialVNode, container) {
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        patch(subTree, container, instance)
        initialVNode.el = subTree.el
    }
    return {
        createApp: createAppAPI(render),
    };
}