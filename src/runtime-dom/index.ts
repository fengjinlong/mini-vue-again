import { createRenderer } from "../runtime-core";
function createElement(type: string) {
  // console.log("dom ------api")
  return document.createElement(type);
}
function patchProp(el, key, prevVal,nextVal) {
  
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}
/**
 * @description 将子节点插入到指定位置anchor，没有指定位置默认插入到最后
 * @author Werewolf
 * @date 2021-12-20
 * @param {*} child
 * @param {*} parent
 * @param {*} anchor 将要插在这个节点之前
 */
function insert(child, parent, anchor) {
  // console.log("dom ------api")

  // 插入到最后
  // parent.append(child) 等价于 parent.insertBefore(child, parent, null)
// console.log()
  parent.insertBefore(child, anchor || null);
}
/**
 * @description 删除子节点
 * @author Werewolf
 * @date 2021-12-17
 * @param {*} child 子节点
 */
function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child)
  }
}

/**
 * @description 设置text 节点
 * @author Werewolf
 * @date 2021-12-17
 * @param {*} el 父容器
 * @param {*} text 子节点
 */
function setElementText(el, text) {
  el.textContent = text
}

const renderer: any= createRenderer({
  createElement,
  patchProp,
  setElementText,
  remove,
  insert,
});

// return {
//   createApp: createAppAPI(render)
// }
export function createApp(...args) {
  return renderer.createApp(...args);

  // 调用流程
  // return createAppAPI(render)(...args);
  // export function createAppAPI(render) {
  //   return function createApp(rootComponent) {
  //     return {
  //       mount(rootContainer) {
  //         // 先创建 vnode
  //         // component -> vnode
  //         // 所有逻辑操作 都会基于 vnode 做处理
  //         const vnode = createVNode(rootComponent);
  //         // 渲染虚拟节点
  //         render(vnode, rootContainer);
  //       },
  //     };
  //   }
  // }
}

export * from "../runtime-core"
export * from "../reactivity"