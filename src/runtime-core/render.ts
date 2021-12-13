import { createComponentInstance, setupComponent } from "./component";

// 查查初始化时候调用render了么？
export function render(vnode, container) {
  // patch
  patch(vnode, container);
}

function patch(vnode: any, container: any) {
  processComponent(vnode, container);
}
function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container: any) {
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
function setupRenderEffect(instance:any, container) {
  const subTree = instance.render()
  // vnode -> element -> mountElement
  patch(subTree, container)
}

