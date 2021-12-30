'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    // console.log(props)
    // 相同的节点 type key 相同
    const vnode = {
        type,
        key: props && props.key,
        props,
        // 组件实例 instance
        component: null,
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
    $props: (i) => i.props,
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
        // 下次要更新的虚拟节点
        next: null,
        type: vnode.type,
        setupState: {},
        isMounted: false,
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
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

const queue = [];
let isFlushPending = false;
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending) {
        return;
    }
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    Promise.resolve().then(() => {
        isFlushPending = false;
        let job;
        while ((job = queue.shift())) {
            job && job();
        }
    });
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, setElementText: hostSetElementText, remove: hostRemove, } = options;
    // 查查初始化时候调用render了么？
    function render(vnode, container) {
        // patch
        patch(null, vnode, container, null, null);
    }
    /**
     * n1 老的
     * n2 新的
     */
    function patch(n1, n2, container, parentComponent, antor) {
        // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, antor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // if (typeof vnode.type === "string") {
                if (shapeFlag & 1 /* ELEMENT */) {
                    // patch element
                    processElement(n1, n2, container, parentComponent, antor);
                    // } else if (isObject(vnode.type)) {
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    // patch 组件
                    console.log("组件逻辑");
                    processComponent(n1, n2, container, parentComponent, antor);
                }
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const text = document.createTextNode(children);
        container.append(text);
    }
    function processFragment(n1, n2, container, parentComponent, antor) {
        mountChildren(n2.children, container, parentComponent, antor);
    }
    function processElement(n1, n2, container, parentComponent, antor) {
        // 包含初始化和更新流程
        // init
        if (!n1) {
            mountElement(n2, container, parentComponent, antor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, antor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, antor) {
        // 获取新，老 prosp
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        // 对比新老props
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        // 对比children
        patchChildren(n1, n2, el, parentComponent, antor);
    }
    function patchChildren(n1, n2, container, parentComponent, antor) {
        // 子节点只有两种类型 文本节点 数组
        /*
          1 新的是text，老的是array
          2 删除老的array 添加 文本节点
        */
        /*
          1 新的 老的都是 文本节点
          2 对比是否相同，不相同的话 替换老的节点
        */
        /*
          1 新的是数组，老的是文本
          2 删除老的，挂载新的
        */
        const { shapeFlag } = n2;
        const c2 = n2.children;
        const c1 = n1.children;
        const prevshapeFlag = n1.shapeFlag;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            // if (prevshapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            //   // 1 把老的 children 删除
            //   unmountChildren(n1.children);
            //   // 2 添加 text
            //   hostSetElementText(container, c2);
            // } else {
            //   // 新老都是文本节点
            //   if(c1 !== c2) {
            //     hostSetElementText(container, c2);
            //   }
            // }
            // 重构一下
            if (prevshapeFlag & 8 /* ARRAY_CHILDREN */) {
                unmountChildren(n1.children);
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 新的是array 老的是text
            if (prevshapeFlag & 4 /* TEXT_CHILDREN */) {
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, antor);
            }
            else {
                // array diff array
                pathKeyedChildren(c1, c2, container, parentComponent, antor);
            }
        }
    }
    /**
     * @description array diff array
     * @author Werewolf
     * @date 2021-12-20
     * @param {*} c1 老
     * @param {*} c2 新
     * @param {*} container 容器
     * @param {*} parentComponent 父组件
     * @param {*} parentAnthor 在这个元素之前插入。原由:插入有位置的要求
     */
    function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
        // 初始指针 i
        let i = 0;
        let l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        function isSameNodeType(n1, n2) {
            // 相同节点 type key 相同
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 初始指针不能超过两个数组
        /**
         * 第一种情况
         * 左侧对吧
         * ab c
         * ab de
         */
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnthor);
            }
            else {
                break;
            }
            i++;
        }
        /**
         * 第二种情况
         * 右侧对比
         * a bc
         * de bc
         */
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnthor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        /**
         * 第三种情况
         * 新的比老的多,两种情况
         * ab        ab
         * ab c    c ab
         */
        if (i > e1) {
            if (i <= e2) {
                const nextPos = i + 1;
                const antor = i + 1 > l2 ? null : c2[nextPos].el;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, antor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            /**
             * 第四种情况
             * 新的比老的少, 两种情况
             * ab c    a bc
             * ab        bc
             */
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间对比,经过以上逻辑已经找到了两个临界点
            /**
             * 第五种情况-1。删除老的d，修改c
             * 旧 ab cd fg
             * 新 ab ec fg
             * 1 旧的里面存在，新的不存在（d），那么需要删除 d。
             * 如果在ec里面遍历看是否存在d，那么时间复杂度是O(n),如果用 key 映射，那么时间复杂度是O(1)
             *
             */
            /**
             * 根据新的节点建立关于key的映射关系 keyToNewIndexMap
             * 在老的节点里根据key查找是否存在值，也就是是否存在 keyToNewIndexMap[oldChild.key]
             * 存在说明是相同节点，拿到索引，进行深度 patch，不存在直接在老的节点里删除
             * 注意：老的节点可能是用户没有写key属性，那只能 for 遍历了
             *
             */
            // s1 s2 新老节点中间不同的起始位置
            let s1 = i;
            let s2 = i;
            /**
             * 优化点：当新节点的个数小于老节点点个数，也就是新的已经patch完毕，但是老节点还存在，那么老节点剩下的无需在对比，直接删除
             * 老 ab cedm fg，新 ab ec fg,当新节点的ec对比完毕，老节点还剩dm，那么直接删除，无需对比
             *
             * toBePatched 新节点需要patch的个数
             * patched 已经处理的个数
             *
             */
            const toBePatched = e2 - s2 + 1;
            let patched = 0;
            // 映射关系
            const keyToNewIndexMap = new Map();
            // 节点位置移动的逻辑
            /**
             * 旧 ab cde fg
             * 新 ab ecd fg
             * newIndexToOldIndexMap的长度是3， 指的是新的 ecd 的映射
             * 我们要把 e 在老数组的的位置（4）映射到 newIndexToOldIndexMap 里面。newIndexToOldIndexMap[0] = 4
             *
             */
            // 建立 初始化映射表 定长数组性能相对要好
            const newIndexToOldIndexMap = new Array(toBePatched);
            /**
             * 优化逻辑
             * moved
             * maxNewIndexSoFar
             */
            let moved = false;
            let maxNewIndexSoFar = 0;
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0;
            }
            // 建立 新的映射关系
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 老的映射关系
            for (let i = s1; i <= e1; i++) {
                // 老节点 prevChild
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    // 新的已经对比完，但是老的还没完事。直接删除
                    hostRemove(prevChild.el);
                    // 进入下一次循环
                    continue;
                }
                let newIndex;
                /**
                 *  如果 newIndex 存在，说明 prevChild 在新的里面存在。
                 *  如果用户写了key，用key映射查找。如果没写key,用循环查找
                 */
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameNodeType(c2[j], prevChild)) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 说明不存在prevChild，删掉老的 prevChild
                    hostRemove(prevChild.el);
                }
                else {
                    /**
                     * 优化点
                     * 思路：
                     * 1 首先最长递归子序列是递增，那么我们想要 newIndex 也应该是递增，也就不用遍历递增序列了，优化了性能
                     * 2 如果不是递增，那么肯定需要 移动并插入
                     *
                     */
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    /**
                     * ab ecd fg
                     * 从e开始映射 e 为 0，newIndex - s2 减去前面相同的 s2 部分
                     * 由于 newIndexToOldIndexMap[i] 的初始化都为 0，0的意义代表 新的存在，老的不存在，需要创建新的
                     * 这里的 e 为 0，有歧义，所以用 i+1 处理，最小 为 1，不会有歧义
                     *
                     * */
                    /**
                     * newIndexToOldIndexMap 逻辑是这样的
                     * 老的 ab  cde  fg
                     * 新的 ad  ecd  fg
                     * 初始 newIndexToOldIndexMap -> [0, 0, 0]
                     * 遍历老节点，老c存在新节点创建的 Map 中，即 老c 的索引是0，所以newIndexToOldIndexMap[1] = 1(0+1)
                     * 同理，老d存在新节点创建的Map中，即 老d 的索引是 1，所以 newIndexToOldIndexMap[2] = 2(1+1)
                     * 老e的索引是2，所以 newIndexToOldIndexMap[0] = 3（2+1）
                     * newIndexToOldIndexMap -> [3, 1, 2]
                     */
                    // 图12
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 存在，继续进行深度对比
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            /**
             * 移动节点
             * 新老都存在，只需要移动节点
             * 找到一个固定的序列cd，减少对比插入次数
             * 算法：最长递增子序列
             * [4,2,3] => [1,2], [4,2,3,5]=>[1,2,4]
             * a[i]<a[i+1] , [i]
             * ab cde fg
             * ab ecd fg
             *
             */
            // const increasingNewSequence = getSequence(newIndexToOldIndexMap);
            /**
             * 优化
             * 如果需要移动再求最长递归子序列，如果不需要直接为 []
             */
            const increasingNewSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            // console.log(increasingNewSequence) [1,2]
            // j 是 increasingNewSequence 的指针
            // let j = 0 正序
            let j = increasingNewSequence.length - 1; // 倒序
            // for 对比逻辑
            // for (let i = 0; i < toBePatched; i++) {
            /**
             * for 的正序遍历存在问题
             * 在移动逻辑时候，需要一个锚点 antor，如果正序，那么插入在这个锚点前面，但是这个锚点可能是不稳点的
             *
             * 如果采用倒序，那么最先移动的也就是最后的，他的锚点不在中间范围，肯定是稳点的
             *
             */
            /**
             *
             * 老的c1 ab cde fg
             * 新的c2 ab ecd fg
             * increasingNewSequence [1, 2]
             * const toBePatched = e2 - s2 + 1 // 3
             * s2=2
             *
             */
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 拿到一个倒序的索引
                const nextIndex = i + s2;
                // 新节点树c2对应的 节点
                const nextChild = c2[nextIndex];
                // 这个节点的下一个节点的el，如果需要移动，那么就插入到这个节点之前，这就是他为锚点
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建逻辑
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    /**
                     * i 是 c2 的中间部分的索引
                     * 如果倒序的索引 i 跟当前的 最长递归子序列的倒序索引 j 相同，那么说明是这个节点的位置不用移动
                     * 如果不相同，那么需要插入这个节点
                     * 需要找到这个节点，和锚点
                     *
                     * */
                    if (j < 0 || i !== increasingNewSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                        // 不在最长递归子序列
                        console.log("移动位置");
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    /**
     * @description 删除children 节点
     * @author Werewolf
     * @date 2021-12-17
     * @param {*} children
     */
    function unmountChildren(children) {
        for (var i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    /**
     * @description patch 属性
     * @author Werewolf
     * @date 2021-12-20
     * @param {*} el
     * @param {*} oldProps
     * @param {*} newProps
     */
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            // newProps 里面的 prop 不在 oldProps 里面，遍历新的
            for (const key in newProps) {
                // 对比props对象的属性
                const prveProp = oldProps[key];
                const nextprop = newProps[key];
                if (prveProp !== nextprop) {
                    // 调用之前的 添加属性方法,需要一个 el
                    // 多传一个参数，同时需要修改 hostPatchProp 方法
                    // hostPatchProp(el, key, prveProp, nextprop)
                    hostPatchProp(el, key, prveProp, nextprop);
                }
            }
            // oldProps 里的 prop 不在 newProps 里面，遍历旧的
            if (oldProps !== {}) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, antor) {
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
            mountChildren(vnode.children, el, parentComponent, antor);
        }
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        // canvas el.x = 10
        // container.append(el);
        hostInsert(el, container, antor);
        // canvas addChild()
    }
    /**
     * @description 挂载数组节点
     * @author Werewolf
     * @date 2021-12-17
     * @param {*} children [vnode1,vnode2]
     * @param {*} container
     * @param {*} parentComponent
     */
    function mountChildren(children, container, parentComponent, antor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, antor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, antor) {
        if (!n1) {
            // 初始化
            mountComponent(n2, container, parentComponent, antor);
        }
        else {
            // 更新组件 调用当前组件的render 函数，重新 vnode 重新 patch, 也就是走 setupRenderEffect 逻辑
            updateComponent(n1, n2);
        }
    }
    /**
     * @description 组件更新
     * @author Werewolf
     * @date 2021-12-24
     * @param {*} n1
     * @param {*} n2
     */
    function updateComponent(n1, n2) {
        // 利用effect runner 逻辑
        /**
         * 怎么找instance，现在只有n 虚拟节点
         * 那么把实例挂载到虚拟节点
         *
         */
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            // 不需要更新也要重置虚拟节点 和 el
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent, antor) {
        // 根据虚拟节点创建组件实例
        // 将组件实例 挂载到虚拟接节点
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
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
        setupRenderEffect(instance, initialVNode, container, antor);
    }
    /**
     * @description 调用render，也就是生成虚拟节点，进行patch。包括 初始化和更新流程
     * @author Werewolf
     * @date 2021-12-24
     * @param {*} instance
     * @param {*} initialVNode
     * @param {*} container
     * @param {*} anchor
     */
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log("init 初始化");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log("update 更新");
                // next 新的虚拟节点
                // vnode 老的虚拟节点
                const { next, vnode } = instance;
                // 更新el
                if (next) {
                    next.el = vnode.el;
                    // 更新属性
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log("effect 的 scheduler 逻辑，数据更新，视图不更新");
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
/**
 * @description 更新属性
 * @author Werewolf
 * @date 2021-12-24
 * @param {*} instance
 * @param {*} nextVNode
 */
function updateComponentPreRender(instance, nextVNode) {
    // 更新实例的虚拟节点
    instance.vnode = nextVNode;
    instance.next = null;
    // 更新props
    instance.props = nextVNode.props;
}
/**
 * @description 最长递增子序列
 * @author Werewolf
 * @date 2021-12-24
 * @param {*} arr
 * @return {*}
 */
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
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

function createElement(type) {
    // console.log("dom ------api")
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
/**
 * @description 将子节点插入到指定位置anchor，没有指定位置默认插入到最后
 * @author Werewolf
 * @date 2021-12-20
 * @param {*} child
 * @param {*} parent
 * @param {*} anchor 将要插在这个节点之前
 */
function insert(child, parent, anchor) {
    // console.log("dom ------api")
    // 插入到最后
    // parent.append(child) 等价于 parent.insertBefore(child, parent, null)
    // console.log()
    parent.insertBefore(child, anchor || null);
}
/**
 * @description 删除子节点
 * @author Werewolf
 * @date 2021-12-17
 * @param {*} child 子节点
 */
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
/**
 * @description 设置text 节点
 * @author Werewolf
 * @date 2021-12-17
 * @param {*} el 父容器
 * @param {*} text 子节点
 */
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    setElementText,
    remove,
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
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.unRef = unRef;
