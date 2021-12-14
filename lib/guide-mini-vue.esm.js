function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null
    };
    // 为处理children准备，给vnode再次添加一个flag
    // 这里的逻辑是这样的
    /**
     * a,b,c,d 为二进制数
     * 如果 c = a | b，那么 c&b 和 c&a 后转为十进制为非0, c&d 后转为10进制为0
     *
    */
    if (typeof children === 'string') {
        // 0001 | 0100 -> 0101 
        // 0010 | 0100 -> 0110
        vnode.shapeFlag = vnode.shapeFlag | 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        // 0001 | 1000 -> 1001
        // 0010 | 1000 -> 1010
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    // vnode 是element元素 还是 组件 0001 0010
    return typeof type === 'string' ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}

const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === "object";
};
const hasOwn = (val, key) => {
    // console.log(val, key);
    return Object.prototype.hasOwnProperty.call(val, key);
};

let targetMap = new Map();
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

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        console.log(instance);
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

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {}
    };
    return component;
}
function setupComponent(instance) {
    // 初始化
    // props
    initProps(instance, instance.vnode.props);
    // initSlots()
    // 创建有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 调用setup 函数，拿到setup函数的返回值
    const Component = instance.vnode.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props));
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // 返回值是function，那就是render函数
    // 返回值是Object，那需要把这个对象挂到组件上下文
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
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

// 查查初始化时候调用render了么？
function render(vnode, container) {
    // patch
    patch(vnode, container);
}
function patch(vnode, container) {
    // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素
    const { shapeFlag } = vnode;
    // if (typeof vnode.type === "string") {
    if (shapeFlag & 1 /* ELEMENT */) {
        // patch element
        processElement(vnode, container);
        // } else if (isObject(vnode.type)) {
    }
    else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        // patch 组件
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    // 包含初始化和更新流程
    // init
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    const { props, children, shapeFlag } = vnode;
    // string array
    // if (typeof children === "string") {
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    for (let key in props) {
        let val = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach((v) => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    // 根据虚拟节点创建组件实例
    const instance = createComponentInstance(initialVNode);
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
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> element -> mountElement
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先创建 vnode
            // component -> vnode
            // 所有逻辑操作 都会基于 vnode 做处理
            const vnode = createVNode(rootComponent);
            // 渲染虚拟节点
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
