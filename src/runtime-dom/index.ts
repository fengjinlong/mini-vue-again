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
function insert(el, parent) {
  // console.log("dom ------api")
  parent.append(el);
}

const renderer: any= createRenderer({
  createElement,
  patchProp,
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