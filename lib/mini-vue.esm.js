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
function getShapeFlags(type) {
    if (typeof type === 'string') {
        return 1 /* ELEMENT */;
    }
    else {
        return 2 /* STATEFUL_COMPONENT */;
    }
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

var targetMaps = new Map();
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

function createComponentInstance(vnode) {
    var instance = {
        vnode: vnode,
        type: vnode.type,
        setupState: {},
        emit: function () { },
        slots: {}, // 存放插槽的数据
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
        var setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
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

var Fragment = Symbol('Fragment');
function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    var type = vnode.type;
    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        default:
            if (vnode.shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container);
            }
            else if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
    }
}
function processFragment(vnode, container) {
    mountChildren(vnode.children, container);
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    var children = vnode.children, shapeFlag = vnode.shapeFlag;
    var el = document.createElement(vnode.type);
    vnode.el = el;
    var isOn = function (key) { return /^on[A-Z]/.test(key); };
    // 处理props
    if (vnode.props) {
        for (var key in vnode.props) {
            if (isOn(key)) {
                var event_1 = key.slice(2).toLowerCase();
                el.addEventListener(event_1, vnode.props[key]);
            }
            else {
                el.setAttribute(key, vnode.props[key]);
            }
        }
    }
    // 处理children
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.append(children);
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(children, el);
    }
    container.append(el);
}
function mountChildren(children, container) {
    children.forEach(function (v) {
        patch(v, container);
    });
}
function mountComponent(initialVNode, container) {
    var instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    var proxy = instance.proxy;
    var subTree = instance.render.call(proxy);
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

function createApp(rootComponent) {
    return {
        mount: function (rootContainer) {
            var vnode = createVnode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function renderSlot(slots, name, props) {
    var slot = slots[name];
    if (slot) {
        // 参数是 props 
        var slotContent = slot(props); // 返回为h()[]
        return h(Fragment, {}, slotContent);
    }
}

export { createApp, h, renderSlot };
