import { shallowReadonly } from "../reactivity/reactive";
import { proxyRefs } from "../reactivity/ref";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode, parent) {
  // instance component
  const instance = {
    vnode,
    // 下次要更新的虚拟节点
    next: null,
    type: vnode.type,
    setupState: {},
    isMounted: false,
    // subTree:'',
    emit: () => {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    props: {}
  };
  instance.emit = emit.bind(null, instance) as any;
  return instance;
}

export function setupComponent(instance) {
  // 初始化
  // props
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);

  // 创建有状态的组件
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  // 调用setup 函数，拿到setup函数的返回值

  const Component = instance.vnode.type;  
  instance.proxy = new Proxy({_: instance}, PublicInstanceProxyHandlers)

  const { setup } = Component;
  if (setup) {
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit
    });
    setCurrentInstance(null)

    handleSetupResult(instance, setupResult);
  }
}
function handleSetupResult(instance: any, setupResult: any) {
  // 返回值是function，那就是render函数
  // 返回值是Object，那需要把这个对象挂到组件上下文
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult)
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
  finishComponentSetup(instance)
}
function finishComponentSetup(instance: any) {
  const Component = instance.type
    instance.render = Component.render
    // instance -> {
    //   render:
    //   setupState
    //   vnode: {
    //     type: App
    //   }
    // }
}

let currentInstance = null
export function  getCurrentInstance () {
  return currentInstance
}
export function setCurrentInstance (instance) {
  currentInstance = instance
}