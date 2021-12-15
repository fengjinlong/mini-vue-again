import { createVNode, Fragment } from "../vnode";

// export function renderSlots(slots, name, props) {
export function renderSlots(slots, name, pro) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {

      return createVNode("div", {}, slot(pro));
    }
  }
  // console.log('render')
  // const slot = slots[name]
  // if (slot) {
  //   if(typeof slot === "function") {

  //     return createVNode(Fragment, {}, slot(props))
  //   }
  // }
}
