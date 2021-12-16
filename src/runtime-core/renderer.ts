import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;

  // 查查初始化时候调用render了么？
  function render(vnode, container) {
    // patch
    patch(null, vnode, container, null);
  }

  /**
   * n1 老的
   * n2 新的
   */
  function patch(n1, n2: any, container: any, parentComponent) {
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
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // patch element
          processElement(n1, n2, container, parentComponent);
          // } else if (isObject(vnode.type)) {
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // patch 组件
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const text = document.createTextNode(children);
    container.append(text);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }

  function processElement(n1, n2: any, container: any, parentComponent) {
    // 包含初始化和更新流程
    // init
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }
  function patchElement(n1, n2, container) {
    // console.log("n1", n1);
    // console.log("n2", n2);

    // 获取新，老 prosp
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    // 对比新老props
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);
  }
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      // newProps 里面的 prop 不在 oldProps 里面，遍历新的
      for (const key in newProps) {
        // 对比props对象的属性
        const prveProp = oldProps[key];
        const nextprop = newProps[key];
        if (prveProp !== nextprop) {
          console.log(prveProp, nextprop);
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
    for (const key in props) {
      const val = props[key];

      hostPatchProp(el, key, null, val);
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
  function processComponent(n1, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent);
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
    effect(() => {
      if (instance.isMounted) {
        const { proxy } = instance;
        // 保存一下第一次的虚拟节点
        const subTree = (instance.subTree = instance.render.call(proxy));
        // vnode -> element -> mountElement
        /**
         * 仅仅加上effect patch 会当初都是初始化的操作，所以需要添加区分初始化和更新
         * 给instance添加一个变量表示 isMounted
         */
        patch(null, subTree, container, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = false;
      } else {
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
