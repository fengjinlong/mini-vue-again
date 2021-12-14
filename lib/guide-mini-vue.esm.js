function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

const isObject = (value) => {
    return value !== null && typeof value === "object";
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    };
    return component;
}
function setupComponent(instance) {
    // 初始化
    // initProps()
    // initSlots()
    // 创建有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 调用setup 函数，拿到setup函数的返回值
    const Component = instance.vnode.type;
    const { setup } = Component;
    console.log();
    if (setup) {
        const setupResult = setup();
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
    console.log(typeof vnode.type);
    if (typeof vnode.type === 'string') {
        // patch element
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
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
    const el = document.createElement(vnode.type);
    const { props, children } = vnode;
    // string array
    if (typeof children === 'string') {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(vnode, el);
    }
    for (let key in props) {
        let val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(v => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    // 根据虚拟节点创建组件实例
    const instance = createComponentInstance(vnode);
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
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    const subTree = instance.render();
    // vnode -> element -> mountElement
    patch(subTree, container);
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