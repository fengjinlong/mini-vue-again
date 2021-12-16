import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProps: hostPatchProps, insert: hostInsert } = options;

  // 查查初始化时候调用render了么？
  function render(vnode, container) {
    // patch
    patch(vnode, container, null);
  }

  function patch(vnode: any, container: any, parentComponent) {
    // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素

    const { type, shapeFlag } = vnode;

    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        // if (typeof vnode.type === "string") {
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // patch element
          processElement(vnode, container, parentComponent);
          // } else if (isObject(vnode.type)) {
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // patch 组件
          processComponent(vnode, container, parentComponent);
        }
    }
  }

  function processText(vnode: any, container: any) {
    const { children } = vnode;
    const text = document.createTextNode(children);
    container.append(text);
  }

  function processFragment(vnode: any, container: any, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }

  function processElement(vnode: any, container: any, parentComponent) {
    // 包含初始化和更新流程
    // init
    mountElement(vnode, container, parentComponent);
  }
  function mountElement(vnode: any, container: any, parentComponent) {
    // canvas new Element
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { props, children, shapeFlag } = vnode;
    // string array
    // if (typeof children === "string") {
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
      patch(v, container, parentComponent);
    });
  }
  function processComponent(vnode: any, container: any, parentComponent) {
    mountComponent(vnode, container, parentComponent);
  }

  function mountComponent(initialVNode: any, container: any, parentComponent) {
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
  function setupRenderEffect(instance: any, initialVNode: any, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> element -> mountElement
    patch(subTree, container, instance);
    initialVNode.el = subTree.el;
  }
  return {
    createApp: createAppAPI(render)
  }
}
