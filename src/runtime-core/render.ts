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
        // 对比左侧
        while (i <= e1 && i <= e2) {
            let n1 = oldChildren[i]
            let n2 = newChildren[i]
            if (!isSomeVNodeType(n1, n2)) {
                break
            }
            patch(n1, n2, container, parentInstance)
            i++
        }
        // 对比右侧
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
        // 如果新增
        if (i > e1 && i <= e2) {
            while (i <= e2) {// i=> e2
                // 添加
                const nextPos = e2 + 1;
                const anchor = nextPos < newLen ? newChildren[nextPos].el : null;
                patch(null, newChildren[i], container, parentInstance, anchor);
                i++
            }
        } else if (i > e2 && i <= e1) { // 如果短 删除
            while (i <= e1) {
                hostRemove(oldChildren[i].el);
                i++
            }
        } else { // 对比中间
            let s1 = i
            let s2 = i
            let patched = 0
            let toBePatched = e2 - s2 + 1;
            let moved = false;
            let maxNewIndexSoFar = 0;
            const keyToNewIndexMap = new Map();
            // 创建newChild key =》 index
            for (let i = s2; i <= e2; i++) {
                if (newChildren[i].key) {
                    keyToNewIndexMap.set(newChildren[i].key, i)
                }
            }

            // 创建映射关系
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

            // 更新已有元素 并 删除没有的元素
            for (let i = s1; i <= e1; i++) {
                let prevChild = oldChildren[i];
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                }
                let newIndex
                // 获取新index
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
                        moved = true; // 判断是否需要移动
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; // 避免与0冲突
                    patch(prevChild, newChildren[newIndex], container, parentInstance, null)
                    patched++;
                }
            }

            // 移动并创建没有的
            // 根据newIndexToOldIndexMap 获取最长递增子序列
            // TODO: 还需要看下
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = newChildren[nextIndex];
                const anchor = nextIndex + 1 < newLen ? newChildren[nextIndex + 1].el : null;

                if (newIndexToOldIndexMap[i] === 0) {
                    // 说明新节点在老的里面不存在
                    // 需要创建
                    patch(null, nextChild, container, parentInstance, anchor);
                } else if (moved) {
                    // 需要移动
                    // 1. j 已经没有了 说明剩下的都需要移动了
                    // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // 移动的话使用 insert 即可
                        hostInsert(nextChild.el, container, anchor);
                    } else {
                        // 这里就是命中了  index 和 最长递增子序列的值
                        // 所以可以移动指针了
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
                const subTree = instance.subTree = instance.render.call(proxy)
                patch(null, subTree, container, instance)
                initialVNode.el = subTree.el
                instance.isMounted = true
            } else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }

                const nextTree = instance.render.call(proxy)
                const preTree = instance.subTree
               
                instance.subTree = nextTree
                 // 替换之前的 subTree
                patch(preTree, nextTree, container, instance)
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
            j = result[result.length - 1]; // 最后一个
            if (arr[j] < arrI) { // 递增 添加
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