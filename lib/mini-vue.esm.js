var extend = Object.assign;
var isObject = function (val) {
    return val !== null && typeof val === "object";
};
var camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
var camelize = function (str) {
    return str.replace(camelizeRE, function (_, c) { return (c ? c.toUpperCase() : ""); });
};
var capitalize = function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
var isOn = function (key) { return /^on[A-Z]/.test(key); };

var activeEffect;
var targetMaps = new Map();
var ReactiveEffect = /** @class */ (function () {
    function ReactiveEffect(fn, scheduler) {
        this.fn = fn;
        this.scheduler = scheduler;
        this.activated = true;
        this.deps = []; // set array
    }
    ReactiveEffect.prototype.run = function () {
        activeEffect = this;
        var res = this.fn();
        activeEffect = undefined; // 需要重置
        return res;
    };
    ReactiveEffect.prototype.stop = function () {
        if (this.activated) {
            stopEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.activated = false;
        }
    };
    return ReactiveEffect;
}());
function stopEffect(effect) {
    effect.deps.forEach(function (dep) {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function getDep(target, key) {
    var deps = targetMaps.get(target); // map
    if (!deps) {
        deps = new Map();
        targetMaps.set(target, deps);
    }
    var dep = deps.get(key); // set
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
    var dep = getDep(target, key);
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
    var dep = getDep(target, key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    if (!dep) {
        return;
    }
    for (var _i = 0, dep_1 = dep; _i < dep_1.length; _i++) {
        var effect_1 = dep_1[_i];
        if (effect_1.scheduler) {
            effect_1.scheduler();
        }
        else {
            effect_1.run();
        }
    }
}
function effect(fn, options) {
    if (options === void 0) { options = {}; }
    var _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    _effect.run();
    var runner = _effect.run.bind(_effect); // fn
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}

function createGetter(isReadonly, isShallow) {
    if (isReadonly === void 0) { isReadonly = false; }
    if (isShallow === void 0) { isShallow = false; }
    return function (target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        var res = Reflect.get(target, key);
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
function createSetter(isReadonly) {
    if (isReadonly === void 0) { isReadonly = false; }
    return function (target, key, value) {
        var res = Reflect.set(target, key, value);
        if (!isReadonly) {
            trigger(target, key);
        }
        return res;
    };
}
var get = createGetter();
var set = createSetter();
var readonlyGet = createGetter(true);
var readonlySet = function (target, key, value) {
    console.warn('readonly/shallowReadonly 不允许修改');
    return true;
};
var shallowReadonlyGet = createGetter(true, true);
var readonlyHandlers = {
    get: readonlyGet,
    set: readonlySet
};
var mutableHandlers = {
    get: get,
    set: set,
};
var shallowReadonlyHandlers = {
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

function emit(instance, event) {
    var arg = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        arg[_i - 2] = arguments[_i];
    }
    var props = instance.props;
    var handlerName = toHandlerKey(camelize(event));
    var handler = props[handlerName];
    if (handler) {
        handler.apply(void 0, arg);
    }
}
var toHandlerKey = function (str) {
    return str ? "on".concat(capitalize(str)) : "";
};

function initProps(instance, props) {
    if (!isObject(props)) {
        return;
    }
    instance.props = props;
}

var publicPropertiesMap = {
    // 当用户调用 instance.proxy.$emit 时就会触发这个函数
    // i 就是 instance 的缩写 也就是组件实例对象
    $el: function (i) { return i.vnode.el; },
    $slots: function (i) { return i.slots; }
};
// todo 需要让用户可以直接在 render 函数内直接使用 this 来触发 proxy
var PublicInstanceProxyHandlers = {
    get: function (_a, key) {
        var instance = _a._;
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
    var vnode = instance.vnode;
    if (vnode.shapeFlag & 16 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
var normalizeSlotValue = function (value) {
    return Array.isArray(value) ? value : [value];
};
var normalizeObjectSlots = function (rawSlots, slots) {
    var _loop_1 = function (key) {
        var value = rawSlots[key];
        if (typeof value === "function") {
            slots[key] = function (props) { return normalizeSlotValue(value(props)); };
        }
    };
    for (var key in rawSlots) {
        _loop_1(key);
    }
};

var currentInstance = null;
function createComponentInstance(vnode, parent) {
    var instance = {
        vnode: vnode,
        type: vnode.type,
        setupState: {},
        emit: function () { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent: parent,
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
    var component = instance.type; // 原始对象
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    var setup = component.setup;
    if (setup) {
        setCurrentInstance(instance);
        var setupResult = setup(shallowReadonly(instance.props), {
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
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    var component = instance.type;
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

var Text = Symbol("Text");
var Fragment = Symbol('Fragment');
function createVnode(type, props, children) {
    if (props === void 0) { props = {}; }
    var vnode = {
        type: type,
        props: props,
        children: children,
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
            mount: function (rootContainer) {
                var vnode = createVnode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    var hostCreateElement = options.createElement, hostSetElementText = options.setElementText, hostPatchProp = options.patchProp, hostInsert = options.insert, hostCreateText = options.createText;
    function render(vnode, container) {
        patch(vnode, container, null);
    }
    function patch(vnode, container, parentInstance) {
        var type = vnode.type;
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentInstance);
                break;
            case Text:
                processText(vnode, container);
                break;
            default:
                if (vnode.shapeFlag & 1 /* ELEMENT */) {
                    processElement(vnode, container, parentInstance);
                }
                else if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(vnode, container, parentInstance);
                }
        }
    }
    function processText(vnode, container) {
        mountText(vnode, container);
    }
    function processFragment(vnode, container, parentInstance) {
        mountChildren(vnode.children, container, parentInstance);
    }
    function processComponent(vnode, container, parentInstance) {
        mountComponent(vnode, container, parentInstance);
    }
    function processElement(vnode, container, parentInstance) {
        mountElement(vnode, container, parentInstance);
    }
    function mountText(vnode, container) {
        var el = hostCreateText(vnode.children);
        vnode.el = el;
        hostInsert(el, container);
    }
    function mountElement(vnode, container, parentInstance) {
        var children = vnode.children, shapeFlag = vnode.shapeFlag, props = vnode.props;
        var el = hostCreateElement(vnode.type);
        vnode.el = el;
        // 处理props
        if (props) {
            for (var key in props) {
                var value = props[key];
                hostPatchProp(el, key, value);
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
    function mountChildren(children, container, parentInstance) {
        children.forEach(function (v) {
            patch(v, container, parentInstance);
        });
    }
    function mountComponent(initialVNode, container, parentInstance) {
        var instance = createComponentInstance(initialVNode, parentInstance);
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        var proxy = instance.proxy;
        var subTree = instance.render.call(proxy);
        patch(subTree, container, instance);
        initialVNode.el = subTree.el;
    }
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlot(slots, name, props) {
    var slot = slots[name];
    if (slot) {
        // 参数是 props 
        var slotContent = slot(props); // 返回为h()[]
        return h(Fragment, {}, slotContent);
    }
}

function provide(key, value) {
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var parent = currentInstance.parent, provides = currentInstance.provides;
        if (parent.provides === provides) {
            provides = currentInstance.provides = Object.create(parent.provides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var parent = currentInstance.parent;
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
    var element = document.createElement(type);
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
function patchProp(el, key, value) {
    if (isOn(key)) {
        var event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
function insert(child, parent, anchor) {
    if (anchor === void 0) { anchor = null; }
    parent.insertBefore(child, anchor);
}
function remove(child) {
    var parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
var createApp = function (root) {
    return createRenderer({
        createElement: createElement,
        createText: createText,
        setText: setText,
        setElementText: setElementText,
        patchProp: patchProp,
        insert: insert,
        remove: remove,
    }).createApp(root);
};

var RefImpl = /** @class */ (function () {
    function RefImpl(value) {
        this.dep = new Set();
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
        this["__v_isRef" /* IS_REF */] = true;
    }
    Object.defineProperty(RefImpl.prototype, "value", {
        get: function () {
            if (isTracking()) {
                trackEffect(this.dep);
            }
            return this._value;
        },
        set: function (newValue) {
            if (newValue !== this._rawValue) {
                this._value = convert(newValue);
                this._rawValue = newValue;
                triggerEffect(this.dep);
            }
        },
        enumerable: false,
        configurable: true
    });
    return RefImpl;
}());
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
        get: function (target, key) {
            return unRef(Reflect.get(target, key));
        },
        set: function (target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

var ComputedRefImpl = /** @class */ (function () {
    function ComputedRefImpl(getter) {
        var _this = this;
        this._value = true;
        this._getter = getter;
        this._is_dirty = true;
        this._effect = new ReactiveEffect(getter, function () {
            _this._is_dirty = true;
        });
    }
    Object.defineProperty(ComputedRefImpl.prototype, "value", {
        get: function () {
            if (this._is_dirty) {
                this._value = this._effect.run();
                this._is_dirty = false;
            }
            return this._value;
        },
        enumerable: false,
        configurable: true
    });
    return ComputedRefImpl;
}());
function computed(fn) {
    return new ComputedRefImpl(fn);
}

export { Fragment, Text, computed, createApp, createAppAPI, createComponentInstance, createRenderer, createTextVnode, createVnode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, provide, proxyRefs, reactive, readonly, ref, renderSlot, setupComponent, shallowReadonly, stop, unRef };
