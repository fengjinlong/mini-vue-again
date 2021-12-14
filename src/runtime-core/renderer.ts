import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

// 查查初始化时候调用render了么？
export function render(vnode, container) {
  // patch
  patch(vnode, container);
}

function patch(vnode: any, container: any) {
  // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素

  const { shapeFlag } = vnode;
  // if (typeof vnode.type === "string") {
  if (shapeFlag & ShapeFlags.ELEMENT) {
    // patch element
    processElement(vnode, container);
  // } else if (isObject(vnode.type)) {
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // patch 组件
    processComponent(vnode, container);
  }
}
function processElement(vnode: any, container: any) {
  // 包含初始化和更新流程
  // init
  mountElement(vnode, container);
}
function mountElement(vnode: any, container: any) {
  const el = (vnode.el = document.createElement(vnode.type));

  const { props, children,shapeFlag } = vnode;
  // string array
  // if (typeof children === "string") {
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }
  for (let key in props) {
    let val = props[key];
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    } else {
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
function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container: any) {
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
function setupRenderEffect(instance: any, initialVNode: any, container) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);
  // vnode -> element -> mountElement
  patch(subTree, container);
  initialVNode.el = subTree.el;
}
