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
    setElementText: hostSetElementText,
    remove: hostRemove,
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
    mountChildren(n2.children, container, parentComponent);
  }

  function processElement(n1, n2: any, container: any, parentComponent) {
    // 包含初始化和更新流程
    // init
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container, parentComponent);
    }
  }
  function patchElement(n1, n2, container, parentComponent) {
    // console.log("n1", n1);
    // console.log("n2", n2);

    // 获取新，老 prosp
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    // 对比新老props
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);

    // 对比children
    patchChildren(n1, n2, el, parentComponent);
  }
  function patchChildren(n1, n2, container, parentComponent) {
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

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
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
      if (prevshapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      // 新的是array 老的是text

      if (prevshapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent);
      } else {
        // array diff array
        pathKeyedChildren(c1, c2, container, parentComponent);
      }
    }
  }

  /**
   *
   *
   * @param {*} c1 老数组
   * @param {*} c2 新数组
   */
  function pathKeyedChildren(c1, c2, container, parentComponent) {
    // 初始指针 i
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    function isSameNodeType(n1, n2) {
      // 相同节点 type key 相同
      return n1.type === n2.type && n1.key === n2.key;
    }
    // 初始指针不能超过两个数组

    /**
     * 左侧对吧
     * ab c
     * ab de
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSameNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent);
      } else {
        break;
      }
      i++;
    }
    /**
     * 右侧对比
     * a bc
     * de bc
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSameNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent);
      } else {
        break;
      }
      e1--;
      e2--;
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
      mountChildren(vnode.children, el, parentComponent);
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
  /**
   * @description 挂载数组节点
   * @author Werewolf
   * @date 2021-12-17
   * @param {*} children [vnode1,vnode2]
   * @param {*} container
   * @param {*} parentComponent
   */
  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
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
