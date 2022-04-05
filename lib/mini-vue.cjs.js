'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
const camelize = (str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
};
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const isOn = (key) => /^on[A-Z]/.test(key);

let activeEffect;
let targetMaps = new Map();
class ReactiveEffect {
    fn;
    scheduler;
    activated = true;
    deps = []; // set array
    onStop;
    constructor(fn, scheduler) {
        this.fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        activeEffect = this;
        const res = this.fn();
        activeEffect = undefined; // 需要重置
        return res;
    }
    stop() {
        if (this.activated) {
            stopEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.activated = false;
        }
    }
}
function stopEffect(effect) {
    effect.deps.forEach(dep => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function getDep(target, key) {
    let deps = targetMaps.get(target); // map
    if (!deps) {
        deps = new Map();
        targetMaps.set(target, deps);
    }
    let dep = deps.get(key); // set
    if (!dep) {
        dep = new Set();
        deps.set(key, dep);
    }
    return dep;
}
function track(target, key) {
    if (!isTracking()) {
        return;
    }
    let dep = getDep(target, key);
    trackEffect(dep);
}
function isTracking() {
    return activeEffect !== undefined;
}
function trackEffect(dep) {
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
function trigger(target, key) {
    let dep = getDep(target, key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    if (!dep) {
        return;
    }
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    let _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect); // fn
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}

function createGetter(isReadonly = false, isShallow = false) {
    return function (target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        let res = Reflect.get(target, key);
        if (!isReadonly) {
            track(target, key);
        }
        if (!isShallow && isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        else {
            return res;
        }
    };
}
function createSetter(isReadonly = false) {
    return function (target, key, value) {
        let res = Reflect.set(target, key, value);
        if (!isReadonly) {
            trigger(target, key);
        }
        return res;
    };
}
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const readonlySet = function (target, key, value) {
    console.warn('readonly/shallowReadonly 不允许修改');
    return true;
};
const shallowReadonlyGet = createGetter(true, true);
const readonlyHandlers = {
    get: readonlyGet,
    set: readonlySet
};
const mutableHandlers = {
    get,
    set,
};
const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set: readonlySet
};

function reactive(target) {
    return createReactiveObject(target, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyHandlers);
}
function isProxy(target) {
    return isReactive(target) || isReadonly(target);
}
function isReactive(target) {
    return !!target["__v_isReactive" /* IS_REACTIVE */];
}
function isReadonly(target) {
    return !!target["__v_isReadonly" /* IS_READONLY */];
}
function createReactiveObject(target, baseHandlers) {
    return new Proxy(target, baseHandlers);
}

class RefImpl {
    _value;
    _rawValue;
    dep = new Set();
    constructor(value) {
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
        this["__v_isRef" /* IS_REF */] = true;
    }
    get value() {
        if (isTracking()) {
            trackEffect(this.dep);
        }
        return this._value;
    }
    set value(newValue) {
        if (newValue !== this._rawValue) {
            this._value = convert(newValue);
            this._rawValue = newValue;
            triggerEffect(this.dep);
        }
    }
}
function convert(value) {
    if (isObject(value)) {
        return reactive(value);
    }
    return value;
}
function ref(target) {
    return new RefImpl(target);
}
function isRef(target) {
    return !!target["__v_isRef" /* IS_REF */];
}
function unRef(target) {
    return isRef(target) ? target.value : target;
}
function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

function emit(instance, event, ...arg) {
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    if (handler) {
        handler(...arg);
    }
}
const toHandlerKey = (str) => str ? `on${capitalize(str)}` : ``;

function initProps(instance, props) {
    if (!isObject(props)) {
        return;
    }
    instance.props = props;
}

const publicPropertiesMap = {
    // 当用户调用 instance.proxy.$emit 时就会触发这个函数
    // i 就是 instance 的缩写 也就是组件实例对象
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
};
// todo 需要让用户可以直接在 render 函数内直接使用 this 来触发 proxy
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        if (key in instance.setupState) {
            return instance.setupState[key];
        }
        else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
        }
        else if (key in instance.props) {
            return instance.props[key];
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
const normalizeSlotValue = (value) => {
    return Array.isArray(value) ? value : [value];
};
const normalizeObjectSlots = (rawSlots, slots) => {
    for (const key in rawSlots) {
        const value = rawSlots[key];
        if (typeof value === "function") {
            slots[key] = (props) => normalizeSlotValue(value(props));
        }
    }
};

let currentInstance = null;
function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        type: vnode.type,
        setupState: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: null,
        props: {},
        next: null
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    // init props
    initProps(instance, instance.vnode.props);
    // init slots
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type; // 原始对象
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'function') {
        instance.render = setupResult;
    }
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    if (!instance.render) {
        instance.render = component.render;
    }
}
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Text = Symbol("Text");
const Fragment = Symbol('Fragment');
function createVnode(type, props, children) {
    let vnode = {
        type,
        props,
        children,
        el: null,
        key: props && props.key,
        shapeFlag: getShapeFlags(type),
        component: null
    };
    if (typeof vnode.children === 'string') {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(vnode.children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */ && isObject(vnode.children)) {
        vnode.shapeFlag |= 16 /* SLOTS_CHILDREN */;
    }
    return vnode;
}
function createTextVnode(children) {
    return createVnode(Text, {}, children);
}
function getShapeFlags(type) {
    if (typeof type === 'string') {
        return 1 /* ELEMENT */;
    }
    else {
        return 2 /* STATEFUL_COMPONENT */;
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVnode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, setElementText: hostSetElementText, patchProp: hostPatchProp, insert: hostInsert, createText: hostCreateText, remove: hostRemove } = options;
    function render(vnode, container) {
        // container dom
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentInstance, anchor = null) {
        const { type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentInstance);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (n2.shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentInstance, anchor);
                }
                else if (n2.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentInstance);
                }
        }
    }
    function processText(n1, n2, container) {
        mountText(n2, container);
    }
    function processFragment(n1, n2, container, parentInstance) {
        mountChildren(n2.children, container, parentInstance);
    }
    function processComponent(n1, n2, container, parentInstance) {
        if (!n1) {
            mountComponent(n2, container, parentInstance);
        }
        else {
            updateCompoent(n1, n2);
        }
    }
    function processElement(n1, n2, container, parentInstance, anchor) {
        if (!n1) {
            mountElement(n2, container, parentInstance, anchor);
        }
        else {
            patchElement(n1, n2, container, parentInstance);
        }
    }
    function updateCompoent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            console.log('update component');
            instance.next = n2;
            instance.update();
        }
        else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function shouldUpdateComponent(prevVNode, nextVNode) {
        const { props: prevProps } = prevVNode;
        const { props: nextProps } = nextVNode;
        if (prevProps === nextProps) {
            return false;
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
        return false;
    }
    function mountText(vnode, container) {
        let el = hostCreateText(vnode.children);
        vnode.el = el;
        hostInsert(el, container);
    }
    function mountElement(vnode, container, parentInstance, anchor) {
        const { children, shapeFlag, props } = vnode;
        let el = hostCreateElement(vnode.type);
        vnode.el = el;
        // 处理props
        if (props) {
            for (const key in props) {
                const value = props[key];
                hostPatchProp(el, key, value, null);
            }
        }
        // 处理children
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            hostSetElementText(el, children);
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parentInstance);
        }
        hostInsert(el, container, anchor);
    }
    function patchElement(n1, n2, container, parentInstance) {
        const el = (n2.el = n1.el);
        patchProps(el, n1.props, n2.props);
        patchChildren(el, n1, n2, parentInstance, el);
    }
    function patchProps(el, oldProps = {}, newProps = {}) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                if (newProps[key] !== oldProps[key]) {
                    hostPatchProp(el, key, newProps[key], oldProps[key]);
                }
            }
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, null, oldProps[key]);
                }
            }
        }
    }
    function patchChildren(el, n1, n2, parentInstance, container) {
        const oldChildren = n1.children;
        const newChildren = n2.children;
        if (n2.shapeFlag & 4 /* TEXT_CHILDREN */) {
            if (oldChildren !== newChildren) {
                hostSetElementText(el, newChildren);
            }
        }
        else {
            if (n1.shapeFlag & 4 /* TEXT_CHILDREN */) {
                hostSetElementText(el, '');
                mountChildren(newChildren, el, parentInstance);
            }
            else {
                patchKeyedChildren(oldChildren, newChildren, container, parentInstance);
            }
        }
    }
    function isSomeVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }
    function patchKeyedChildren(oldChildren, newChildren, container, parentInstance) {
        let newLen = newChildren.length;
        let i = 0;
        let e1 = oldChildren.length - 1;
        let e2 = newLen - 1;
        // 对比左侧
        while (i <= e1 && i <= e2) {
            let n1 = oldChildren[i];
            let n2 = newChildren[i];
            if (!isSomeVNodeType(n1, n2)) {
                break;
            }
            patch(n1, n2, container, parentInstance);
            i++;
        }
        // 对比右侧
        while (e1 >= i && e2 >= i) {
            let n1 = oldChildren[e1];
            let n2 = newChildren[e2];
            if (!isSomeVNodeType(n1, n2)) {
                break;
            }
            patch(n1, n2, container, parentInstance);
            e1--;
            e2--;
        }
        // 如果新增
        if (i > e1 && i <= e2) {
            while (i <= e2) { // i=> e2
                // 添加
                const nextPos = e2 + 1;
                const anchor = nextPos < newLen ? newChildren[nextPos].el : null;
                patch(null, newChildren[i], container, parentInstance, anchor);
                i++;
            }
        }
        else if (i > e2 && i <= e1) { // 如果短 删除
            while (i <= e1) {
                hostRemove(oldChildren[i].el);
                i++;
            }
        }
        else { // 对比中间
            let s1 = i;
            let s2 = i;
            let patched = 0;
            let toBePatched = e2 - s2 + 1;
            let moved = false;
            let maxNewIndexSoFar = 0;
            const keyToNewIndexMap = new Map();
            // 创建newChild key =》 index
            for (let i = s2; i <= e2; i++) {
                if (newChildren[i].key) {
                    keyToNewIndexMap.set(newChildren[i].key, i);
                }
            }
            // 创建映射关系
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            // 更新已有元素 并 删除没有的元素
            for (let i = s1; i <= e1; i++) {
                let prevChild = oldChildren[i];
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                }
                let newIndex;
                // 获取新index
                if (prevChild.key) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, newChildren[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (!newIndex) {
                    hostRemove(prevChild.el);
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true; // 判断是否需要移动
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; // 避免与0冲突
                    patch(prevChild, newChildren[newIndex], container, parentInstance, null);
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
                }
                else if (moved) {
                    // 需要移动
                    // 1. j 已经没有了 说明剩下的都需要移动了
                    // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // 移动的话使用 insert 即可
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
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
            patch(null, v, container, parentInstance);
        });
    }
    function mountComponent(initialVNode, container, parentInstance) {
        const instance = createComponentInstance(initialVNode, parentInstance);
        initialVNode.component = instance;
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        instance.update = effect(() => {
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const nextTree = instance.render.call(proxy);
                const preTree = instance.subTree;
                instance.subTree = nextTree;
                // 替换之前的 subTree
                patch(preTree, nextTree, container, instance);
            }
        });
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
function getSequence(arr) {
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
                }
                else {
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

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlot(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // 参数是 props 
        const slotContent = slot(props); // 返回为h()[]
        return h(Fragment, {}, slotContent);
    }
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { parent, provides } = currentInstance;
        if (parent.provides === provides) {
            provides = currentInstance.provides = Object.create(parent.provides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const { parent } = currentInstance;
        if (key in parent.provides) {
            return parent.provides[key];
        }
        if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            else {
                return defaultValue;
            }
        }
    }
}

// 源码里面这些接口是由 runtime-dom 来实现
// 后面也修改成和源码一样的实现
function createElement(type) {
    const element = document.createElement(type);
    return element;
}
function createText(text) {
    return document.createTextNode(text);
}
function setText(node, text) {
    node.nodeValue = text;
}
function setElementText(el, text) {
    el.textContent = text;
}
function patchProp(el, key, newValue, oldValue) {
    if (isOn(key)) {
        let event = key.slice(2).toLowerCase();
        el.addEventListener(event, newValue);
    }
    else {
        if (!newValue) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, newValue);
        }
    }
}
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
const createApp = (root) => {
    return createRenderer({
        createElement,
        createText,
        setText,
        setElementText,
        patchProp,
        insert,
        remove,
    }).createApp(root);
};

class ComputedRefImpl {
    _getter;
    _is_dirty;
    _value = true;
    _effect;
    constructor(getter) {
        this._getter = getter;
        this._is_dirty = true;
        this._effect = new ReactiveEffect(getter, () => {
            this._is_dirty = true;
        });
    }
    get value() {
        if (this._is_dirty) {
            this._value = this._effect.run();
            this._is_dirty = false;
        }
        return this._value;
    }
}
function computed(fn) {
    return new ComputedRefImpl(fn);
}

exports.Fragment = Fragment;
exports.Text = Text;
exports.computed = computed;
exports.createApp = createApp;
exports.createAppAPI = createAppAPI;
exports.createComponentInstance = createComponentInstance;
exports.createRenderer = createRenderer;
exports.createTextVnode = createTextVnode;
exports.createVnode = createVnode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlot = renderSlot;
exports.setupComponent = setupComponent;
exports.shallowReadonly = shallowReadonly;
exports.stop = stop;
exports.unRef = unRef;
