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
    patch(null, vnode, container, null, null);
  }

  /**
   * n1 老的
   * n2 新的
   */
  function patch(n1, n2: any, container: any, parentComponent, antor) {
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
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // patch element
          processElement(n1, n2, container, parentComponent, antor);
          // } else if (isObject(vnode.type)) {
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // patch 组件
          processComponent(n1, n2, container, parentComponent, antor);
        }
    }
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const text = document.createTextNode(children);
    container.append(text);
  }

  function processFragment(
    n1,
    n2: any,
    container: any,
    parentComponent,
    antor
  ) {
    mountChildren(n2.children, container, parentComponent, antor);
  }

  function processElement(n1, n2: any, container: any, parentComponent, antor) {
    // 包含初始化和更新流程
    // init
    if (!n1) {
      mountElement(n2, container, parentComponent, antor);
    } else {
      patchElement(n1, n2, container, parentComponent, antor);
    }
  }
  function patchElement(n1, n2, container, parentComponent, antor) {
    // console.log("n1", n1);
    // console.log("n2", n2);

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
        mountChildren(c2, container, parentComponent, antor);
      } else {
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
      } else {
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
      } else {
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
    } else if (i > e2) {
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
    } else {
      // 中间对比,经过以上逻辑已经找到了两个临界点
      /**
       * 第五种情况-1。删除老的d，修改c
       * 旧 ab cd fg
       * 新 ab ec fg
       * 1 旧的里面存在，新的不存在（d），那么需要删除 d。
       * 如果在ec里面遍历看是否存在d，那么时间复杂度是O(n),如果用 key 映射，那么时间复杂度是O(1)
       *
       */

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

      // 移动的逻辑
      /**
       * 旧 ab cde fg
       * 新 ab ecd fg
       * newIndexToOldIndexMap的长度是3， 指的是新的 ecd 的映射
       * 我们要把 e 在老数组的的位置（4）映射到 newIndexToOldIndexMap 里面。newIndexToOldIndexMap[0] = 4
       * 
      */

      // 初始化映射表
      const newIndexToOldIndexMap = new Array(toBePatched)
      for (let i = 0; i < toBePatched;i++) {
        newIndexToOldIndexMap[i] = 0
      }

      // 新的映射关系
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
        } else {
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
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          // 存在，继续进行深度对比
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;

        }
      }
    }
  }

  /**
   * 移动节点
   * 新老都存在，只需要移动节点
   * 找到一个固定的序列cd，减少对比插入次数
   * 算法：最长递增子序列
   * ab cde fg
   * ab ecd fg
  */

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

  function mountElement(vnode: any, container: any, parentComponent, antor) {
    // canvas new Element
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { props, children, shapeFlag } = vnode;
    // string array
    // if (typeof children === "string") {
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
  function processComponent(
    n1,
    n2: any,
    container: any,
    parentComponent,
    antor
  ) {
    mountComponent(n2, container, parentComponent, antor);
  }

  function mountComponent(
    initialVNode: any,
    container: any,
    parentComponent,
    antor
  ) {
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
    setupRenderEffect(instance, initialVNode, container, antor);
  }
  function setupRenderEffect(
    instance: any,
    initialVNode: any,
    container,
    antor
  ) {
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
        patch(null, subTree, container, instance, antor);
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
        patch(prevSubTree, subTree, container, instance, antor);
      }
    });
  }
  return {
    createApp: createAppAPI(render),
  };
}
