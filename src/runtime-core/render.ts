import { ShapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp";
import { effect } from "../index";
import { queueJob } from "./scheduler";
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        patchProp: hostPatchProp,
        insert: hostInsert,
        createText: hostCreateText,
        remove: hostRemove
    } = options;
    function render(vnode, container) {
        // container dom
        patch(null, vnode, container, null, null)
    }
    function patch(n1, n2, container, parentInstance, anchor = null) {
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
                    processElement(n1, n2, container, parentInstance, anchor)
                } else if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentInstance)
                }
        }

    }
    function processText(n1, n2, container) {
        mountText(n2, container)
    }
    function processFragment(n1, n2, container, parentInstance) {
        mountChildren(n2.children, container, parentInstance)
    }
    function processComponent(n1, n2, container, parentInstance) {
        if(!n1) {
            mountComponent(n2, container, parentInstance)
        }else {
            updateCompoent(n1, n2)
        }
    }
    function processElement(n1, n2, container, parentInstance, anchor) {
        if (!n1) {
            mountElement(n2, container, parentInstance, anchor)
        } else {
            patchElement(n1, n2, container, parentInstance)
        }
    }
    function updateCompoent(n1,n2) {
        const instance = (n2.component = n1.component);
        if(shouldUpdateComponent(n1,n2)) {
            console.log('update component')
            instance.next = n2;
            instance.update()
        }else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function shouldUpdateComponent(prevVNode,nextVNode) {
        const { props: prevProps } = prevVNode;
        const { props: nextProps } = nextVNode;
        if(prevProps === nextProps) {
            return false
        }
        if (!prevProps) {
            return !!nextProps;
        }
        if (!nextProps) {
            return true;
        }
        
        const nextKeys = Object.keys(nextProps);
        if (nextKeys.length !== Object.keys(prevProps).length) {
            return true;
        }

        for (let i = 0; i < nextKeys.length; i++) {
            const key = nextKeys[i];
            if (nextProps[key] !== prevProps[key]) {
              return true;
            }
        }
        return false
    }
    function mountText(vnode, container) {
        let el = hostCreateText(vnode.children)
        vnode.el = el
        hostInsert(el, container)
    }
    function mountElement(vnode, container, parentInstance, anchor) {
        const { children, shapeFlag, props } = vnode
        let el = hostCreateElement(vnode.type)
        vnode.el = el
        // ??????props
        if (props) {
            for (const key in props) {
                const value = props[key];
                hostPatchProp(el, key, value, null);
            }
        }
        // ??????children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el, parentInstance)
        }
        hostInsert(el, container, anchor)
    }
    function patchElement(n1, n2, container, parentInstance) {
        const el = (n2.el = n1.el);
        patchProps(el, n1.props, n2.props)
        patchChildren(el, n1, n2, parentInstance, el)
    }
    function patchProps(el, oldProps = {}, newProps = {}) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                if (newProps[key] !== oldProps[key]) {
                    hostPatchProp(el, key, newProps[key], oldProps[key])
                }
            }
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, null, oldProps[key])
                }
            }
        }
    }
    function patchChildren(el, n1, n2, parentInstance, container) {
        const oldChildren = n1.children
        const newChildren = n2.children
        if (n2.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (oldChildren !== newChildren) {
                hostSetElementText(el, newChildren)
            }
        } else {
            if (n1.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(el, '')
                mountChildren(newChildren, el, parentInstance)
            } else {
                patchKeyedChildren(oldChildren, newChildren, container, parentInstance)
            }
        }
    }
    function isSomeVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }
    function patchKeyedChildren(oldChildren, newChildren, container, parentInstance) {
        let newLen = newChildren.length
        let i = 0;
        let e1 = oldChildren.length - 1
        let e2 = newLen - 1
        // ????????????
        while (i <= e1 && i <= e2) {
            let n1 = oldChildren[i]
            let n2 = newChildren[i]
            if (!isSomeVNodeType(n1, n2)) {
                break
            }
            patch(n1, n2, container, parentInstance)
            i++
        }
        // ????????????
        while (e1 >= i && e2 >= i) {
            let n1 = oldChildren[e1]
            let n2 = newChildren[e2]
            if (!isSomeVNodeType(n1, n2)) {
                break
            }
            patch(n1, n2, container, parentInstance)
            e1--
            e2--
        }
        // ????????????
        if (i > e1 && i <= e2) {
            while (i <= e2) {// i=> e2
                // ??????
                const nextPos = e2 + 1;
                const anchor = nextPos < newLen ? newChildren[nextPos].el : null;
                patch(null, newChildren[i], container, parentInstance, anchor);
                i++
            }
        } else if (i > e2 && i <= e1) { // ????????? ??????
            while (i <= e1) {
                hostRemove(oldChildren[i].el);
                i++
            }
        } else { // ????????????
            let s1 = i
            let s2 = i
            let patched = 0
            let toBePatched = e2 - s2 + 1;
            let moved = false;
            let maxNewIndexSoFar = 0;
            const keyToNewIndexMap = new Map();
            // ??????newChild key =??? index
            for (let i = s2; i <= e2; i++) {
                if (newChildren[i].key) {
                    keyToNewIndexMap.set(newChildren[i].key, i)
                }
            }

            // ??????????????????
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

            // ?????????????????? ??? ?????????????????????
            for (let i = s1; i <= e1; i++) {
                let prevChild = oldChildren[i];
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                }
                let newIndex
                // ?????????index
                if (prevChild.key) {
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, newChildren[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (!newIndex) {
                    hostRemove(prevChild.el)
                } else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    } else {
                        moved = true; // ????????????????????????
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; // ?????????0??????
                    patch(prevChild, newChildren[newIndex], container, parentInstance, null)
                    patched++;
                }
            }

            // ????????????????????????
            // ??????newIndexToOldIndexMap ???????????????????????????
            // TODO: ???????????????
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = newChildren[nextIndex];
                const anchor = nextIndex + 1 < newLen ? newChildren[nextIndex + 1].el : null;

                if (newIndexToOldIndexMap[i] === 0) {
                    // ???????????????????????????????????????
                    // ????????????
                    patch(null, nextChild, container, parentInstance, anchor);
                } else if (moved) {
                    // ????????????
                    // 1. j ??????????????? ?????????????????????????????????
                    // 2. ????????????????????????????????????????????????????????? ??????????????????????????????
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // ?????????????????? insert ??????
                        hostInsert(nextChild.el, container, anchor);
                    } else {
                        // ?????????????????????  index ??? ???????????????????????????
                        // ???????????????????????????
                        j--;
                    }
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

        initialVNode.component = instance

        setupComponent(instance)

        setupRenderEffect(instance, initialVNode, container)
    }
    function setupRenderEffect(instance, initialVNode, container) {
        instance.update = effect(() => {
            const { proxy, isMounted } = instance
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy, proxy)
                patch(null, subTree, container, instance)
                initialVNode.el = subTree.el
                instance.isMounted = true
            } else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }

                const nextTree = instance.render.call(proxy, proxy)
                const preTree = instance.subTree
               
                instance.subTree = nextTree
                 // ??????????????? subTree
                patch(preTree, nextTree, container, instance)
            }

        }, {
            scheduler:()=> {
                queueJob(instance.update);
            }
        })
    }
    function updateComponentPreRender(instance, nextVnode) {
        nextVnode.component = instance;
        instance.vnode = nextVnode;
        instance.next = null;
    
        const { props } = nextVnode;
        instance.props = props;
    }
    return {
        createApp: createAppAPI(render),
    };
}
function getSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1]; // ????????????
            if (arr[j] < arrI) { // ?????? ??????
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}