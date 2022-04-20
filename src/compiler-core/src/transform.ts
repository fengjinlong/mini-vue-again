
export function transform(root, options) {
  // 全局上下文
  const context = createTransformContext(root, options);
  // 遍历
  traverseNode(root, context);
  // 修改
}

function traverseNode(node: any, context) {
  const nodeTransformer = context.nodeTransformer;
  for (let i = 0; i < nodeTransformer.length; i++) {
    let transform = nodeTransformer[i];
    transform(node);
  }
  traverseChildren(node, context);
}
function traverseChildren(node: any, context: any) {
  const children = node.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      traverseNode(node, context);
    }
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransformer: options.nodeTransformer || {},
  };
  return context;
}
