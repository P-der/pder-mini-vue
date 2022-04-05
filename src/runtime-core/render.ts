import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp";
import { effect } from "../index";
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        patchProp: hostPatchProp,
        insert: hostInsert,
        createText: hostCreateText,
    } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null)
    }
    function patch(n1, n2, container, parentInstance) {
        const { type } = n2
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentInstance)
                break;
            case Text:
                processText(n1, n2, container)
                break;
            default:
                if (n2.shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentInstance)
                } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1,n2, container, parentInstance)
                }
        }

    }
    function processText(n1, n2, container) {
        mountText(n2, container)
    }
    function processFragment(n1,n2, container, parentInstance) {
        mountChildren(n2.children, container, parentInstance)
    }
    function processComponent(n1,n2, container, parentInstance) {
        mountComponent(n2, container, parentInstance)
    }
    function processElement(n1, n2, container, parentInstance) {
        if(!n1) {
            mountElement(n2, container, parentInstance)
        }else {
            patchElement(n1,n2, container)
        }
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
                hostPatchProp(el, key, value, null);
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
    function patchElement(n1, n2, container) {
        const el = (n2.el = n1.el);
        patchProps(el, n1.props, n2.props)
    }
    function patchProps(el, oldProps ={}, newProps= {}) {
        if(oldProps !== newProps) {
            for(const key in newProps) {
                if( newProps[key]!== oldProps[key]) {
                    hostPatchProp(el, key,  newProps[key], oldProps[key])
                }
            }
            for(const key in oldProps) {
                if(!(key in newProps)) {
                    hostPatchProp(el, key, null, oldProps[key])
                }
            }
        }
    }
    function mountChildren(children, container, parentInstance) {
        children.forEach(v => {
            patch(null, v, container, parentInstance)
        })
    }
    function mountComponent(initialVNode, container, parentInstance) {
        const instance = createComponentInstance(initialVNode, parentInstance)

        setupComponent(instance)

        setupRenderEffect(instance, initialVNode, container)
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(()=> {
            const { proxy, isMounted } = instance
            if(!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy)
                patch(null, subTree, container, instance)
                initialVNode.el = subTree.el
                instance.isMounted = true
            }else {
                const subTree = instance.render.call(proxy)
                const preTree = instance.subTree
                instance.subTree = subTree
                patch(preTree, subTree, container, instance)
                // initialVNode.el = subTree.el
            }
           
        })
    }
    return {
        createApp: createAppAPI(render),
    };
}