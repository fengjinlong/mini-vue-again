'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    // 为处理children准备，给vnode再次添加一个flag
    // 这里的逻辑是这样的
    /**
     * a,b,c,d 为二进制数
     * 如果 c = a | b，那么 c&b 和 c&a 后转为十进制为非0, c&d 后转为10进制为0
     *
     */
    if (typeof children === "string") {
        // 0001 | 0100 -> 0101
        // 0010 | 0100 -> 0110
        vnode.shapeFlag = vnode.shapeFlag | 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        // 0001 | 1000 -> 1001
        // 0010 | 1000 -> 1010
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ARRAY_CHILDREN */;
    }
    // slots children
    // 组件 + children object
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* SLOTS_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    // vnode 是element元素 还是 组件 0001 0010
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === "object";
};
const hasChanged = (v1, v2) => {
    return !Object.is(v1, v2);
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

class ReactiveEffect {
    // pbulic 是为了给外部获取到
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = [];
        // active 是处理重复调用stop的
        this.active = true;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            // 不应该收集依赖
            // 如果调用了stop，active 为 false
            // 只调用第一次的 _fn, 不进行下面的依赖赋值，也就是不进行依赖收集的 track 操作
            return this._fn();
        }
        // this 就是依赖的,依赖的run 方法就是执行fn
        // 应该收集依赖逻辑
        activeEffect = this;
        shouldTract = true;
        const r = this._fn();
        shouldTract = false;
        return r;
    }
    stop() {
        // 1个 dep 对应多个 effect,同一个effect可能存在多个dep里面
        // 现在要清除所有 dep 里面的 目标effect，也就是先遍历depsMap得到dep，在delete每一个dep里面的effect
        // 但是depsMap 与 effect不存在关联关系，也就是说当前的effect 不能关系到 所有的depsMap
        // 这样处理，
        /**
         * 1. dep 与 effect 的关系的 dep.add(effect)
         * 2. 我们给每一个effect 添加一个deps 的数组空间，用来存储谁 add 当前端的effect 了
         * 3. 那么，我们就能从effect 本身关联到与他有关的所有dep了，也就是 deps 数组
         * 4. 返回来，只要遍历当前的的efect的deps属性（deps这里面的每一个dep都存在effect），dep是Set，deps是数组
         * 5. effect.deps.forEach(dep => dep.delete(effect))
         */
        if (this.active) {
            if (this.onStop) {
                this.onStop();
            }
            cleanUpEffect(this);
            this.active = false;
        }
    }
}
function cleanUpEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
let targetMap = new Map();
let activeEffect;
let shouldTract;
function track(target, key) {
    if (!isTracking())
        return;
    // target key dep
    // 对象-- key -- 依赖
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    // 这不光光是抽离一个函数那么简单，为ref做准备
    trackEffects(dep);
    // if(dep.has(activeEffect)) return
    // dep.add(activeEffect);
    // activeEffect.deps.push(dep);
}
function trackEffects(dep) {
    // 看看 dep 之前有没有添加过，添加过的话 那么就不添加了
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTract && activeEffect !== undefined;
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.onStop = options.onStop;
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key === "__v_isREADONLY" /* IS_READONLY */) {
            return isReadOnly;
        }
        let res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadOnly ? readonly(res) : reactive(res);
        }
        // TODO 收集依赖
        if (!isReadOnly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        let res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandles = {
    get,
    set,
};
const readonlyHandles = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`${key} 不能set，readonly！`);
        return true;
    },
};
const shallowReadonlyHandles = extend({}, readonlyHandles, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandles);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandles);
}
function createReactiveObject(raw, baseHandlers) {
    return new Proxy(raw, baseHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandles);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        // 存一下原始值，当value 为reactive时候使用
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 如果value 是个reactive类型，那么需要用他的原始值作比较
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            // 必须是先修改在调用trigger
            convert(newValue);
            triggerEffect(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function isRef(value) {
    return !!value.__v_isRef;
}
function unRef(value) {
    return !!value.__v_isRef ? value.value : value;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
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
    // add -> Add
    // add-add -> addAdd
    const handlerName = toHandlerKey(camelize(event));
    // console.log(handlerName)
    const handler = props[handlerName];
    handler && handler(...arg);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // console.log(instance)
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // $el
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = props => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    // instance component
    const instance = {
        vnode,
        type: vnode.type,
        setupState: {},
        isMounted: true,
        // subTree:'',
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        props: {}
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    // 初始化
    // props
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    // 创建有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 调用setup 函数，拿到setup函数的返回值
    const Component = instance.vnode.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
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
    // 返回值是function，那就是render函数
    // 返回值是Object，那需要把这个对象挂到组件上下文
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    // 保证组件render有值
    // 组件 -> const App = {
    //   render() {
    //     return h("div", this.msg)
    //   },
    //   setup() {
    //     return {
    //       msg: "hello vue"
    //     }
    //   }
    // }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
    // instance -> {
    //   render:
    //   setupState
    //   vnode: {
    //     type: App
    //   }
    // }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // 初始化
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

// import { render } from "./renderer";
function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先创建 vnode
                // component -> vnode
                // 所有逻辑操作 都会基于 vnode 做处理
                const vnode = createVNode(rootComponent);
                // 渲染虚拟节点
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert, } = options;
    // 查查初始化时候调用render了么？
    function render(vnode, container) {
        // patch
        patch(null, vnode, container, null);
    }
    /**
     * n1 老的
     * n2 新的
     */
    function patch(n1, n2, container, parentComponent) {
        // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // if (typeof vnode.type === "string") {
                if (shapeFlag & 1 /* ELEMENT */) {
                    // patch element
                    processElement(n1, n2, container, parentComponent);
                    // } else if (isObject(vnode.type)) {
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // patch 组件
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const text = document.createTextNode(children);
        container.append(text);
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processElement(n1, n2, container, parentComponent) {
        // 包含初始化和更新流程
        // init
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        console.log("n1", n1);
        console.log("n2", n2);
    }
    function mountElement(vnode, container, parentComponent) {
        // canvas new Element
        // const el = (vnode.el = document.createElement(vnode.type));
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { props, children, shapeFlag } = vnode;
        // string array
        // if (typeof children === "string") {
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        for (let key in props) {
            let val = props[key];
            hostPatchProps(el, key, val);
        }
        // canvas el.x = 10
        // container.append(el);
        hostInsert(el, container);
        // canvas addChild()
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 根据虚拟节点创建组件实例
        const instance = createComponentInstance(initialVNode, parentComponent);
        // 初始化，收集信息，instance挂载相关属性，方法, 装箱
        setupComponent(instance);
        // 渲染组件，调用组件的render方法
        // 组件 -> const App = {
        //   render() {
        //     return h("div", this.msg)
        //   },
        //   setup() {
        //     return {
        //       msg: "hello vue"
        //     }
        //   }
        // }
        // 一个组件不会真实渲染出来，渲染的是组件的render函数内部的element值，拆箱过程
        // render 返回的subTree 给patch，如果是组件继续递归，如果是element 则渲染
        setupRenderEffect(instance, initialVNode, container);
    }
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (instance.isMounted) {
                const { proxy } = instance;
                // 保存一下第一次的虚拟节点
                const subTree = (instance.subTree = instance.render.call(proxy));
                // vnode -> element -> mountElement
                console.log(subTree);
                /**
                 * 仅仅加上effect patch 会当初都是初始化的操作，所以需要添加区分初始化和更新
                 * 给instance添加一个变量表示 isMounted
                 */
                patch(null, subTree, container, instance);
                initialVNode.el = subTree.el;
                instance.isMounted = false;
            }
            else {
                const { proxy } = instance;
                // 新的虚拟节点
                const subTree = instance.render.call(proxy);
                // 上一个虚拟节点
                const prevSubTree = instance.subTree;
                // 更改保存的
                instance.subTree = prevSubTree;
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}

function createElement(type) {
    // console.log("dom ------api")
    return document.createElement(type);
}
function patchProps(el, key, val) {
    // console.log("dom ------api")
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    // console.log("dom ------api")
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProps,
    insert,
});
// return {
//   createApp: createAppAPI(render)
// }
function createApp(...args) {
    return renderer.createApp(...args);
    // 调用流程
    // return createAppAPI(render)(...args);
    // export function createAppAPI(render) {
    //   return function createApp(rootComponent) {
    //     return {
    //       mount(rootContainer) {
    //         // 先创建 vnode
    //         // component -> vnode
    //         // 所有逻辑操作 都会基于 vnode 做处理
    //         const vnode = createVNode(rootComponent);
    //         // 渲染虚拟节点
    //         render(vnode, rootContainer);
    //       },
    //     };
    //   }
    // }
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.unRef = unRef;
