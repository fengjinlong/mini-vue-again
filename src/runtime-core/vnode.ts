import { ShapeFlags } from "../shared/ShapeFlags";

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type),
    el: null
  };

  // 为处理children准备，给vnode再次添加一个flag
  // 这里的逻辑是这样的
  /**
   * a,b,c,d 为二进制数
   * 如果 c = a | b，那么 c&b 和 c&a 后转为十进制为非0, c&d 后转为10进制为0
   * 
  */
  if (typeof children === 'string') {
    // 0001 | 0100 -> 0101 
    // 0010 | 0100 -> 0110
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 
  } else if (Array.isArray(children)) {
    // 0001 | 1000 -> 1001
    // 0010 | 1000 -> 1010
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN
  }
  return vnode;
}
function getShapeFlag(type: any) {
  // vnode 是element元素 还是 组件 0001 0010
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT 
}
