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
    $slots: (i) => i.slots
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
        subTree: null
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
function createVnode(type, props = {}, children) {
    let vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlags(type)
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
    const { createElement: hostCreateElement, setElementText: hostSetElementText, patchProp: hostPatchProp, insert: hostInsert, createText: hostCreateText, } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
    }
    function patch(n1, n2, container, parentInstance) {
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
                    processElement(n1, n2, container, parentInstance);
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
        mountComponent(n2, container, parentInstance);
    }
    function processElement(n1, n2, container, parentInstance) {
        if (!n1) {
            mountElement(n2, container, parentInstance);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function mountText(vnode, container) {
        let el = hostCreateText(vnode.children);
        vnode.el = el;
        hostInsert(el, container);
    }
    function mountElement(vnode, container, parentInstance) {
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
        hostInsert(el, container);
    }
    function patchElement(n1, n2, container) {
        const el = (n2.el = n1.el);
        patchProps(el, n1.props, n2.props);
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
    function mountChildren(children, container, parentInstance) {
        children.forEach(v => {
            patch(null, v, container, parentInstance);
        });
    }
    function mountComponent(initialVNode, container, parentInstance) {
        const instance = createComponentInstance(initialVNode, parentInstance);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const subTree = instance.render.call(proxy);
                const preTree = instance.subTree;
                instance.subTree = subTree;
                patch(preTree, subTree, container, instance);
                // initialVNode.el = subTree.el
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
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
function insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
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
