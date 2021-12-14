import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
  };
  return component;
}

export function setupComponent(instance) {
  // 初始化
  // initProps()
  // initSlots()

  // 创建有状态的组件
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  // 调用setup 函数，拿到setup函数的返回值

  const Component = instance.vnode.type;  
  instance.proxy = new Proxy({_: instance}, PublicInstanceProxyHandlers)

  const { setup } = Component;
  if (setup) {
    const setupResult = setup();

    handleSetupResult(instance, setupResult);
  }
}
function handleSetupResult(instance: any, setupResult: any) {
  // 返回值是function，那就是render函数
  // 返回值是Object，那需要把这个对象挂到组件上下文
  if (typeof setupResult === "object") {
    instance.setupState = setupResult
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

