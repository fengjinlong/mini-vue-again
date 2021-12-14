export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null
    // el: any
  };
  return vnode;
}
