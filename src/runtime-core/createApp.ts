import { createVNode } from "./createVNode"
import { render } from "./render"

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先创建 vnode
      // component -> vnode
      // 所有逻辑操作 都会基于 vnode 做处理
      const vnode = createVNode(rootComponent)
      // 渲染虚拟节点
      render(vnode, rootContainer)
    }
  }
}