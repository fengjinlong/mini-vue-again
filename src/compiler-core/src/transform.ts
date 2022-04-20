import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";

export function transform(root, options = {}) {
  // 全局上下文
  const context = createTransformContext(root, options);
  // 遍历
  traverseNode(root, context);
  createRootCodegen(root);
  root.helpers = [...context.helpers.keys()];
  // 修改
}
function createRootCodegen(root) {
  root.codegenNode = root.children[0];
}
function traverseNode(node: any, context) {
  const nodeTransformer = context.nodeTransformer;
  for (let i = 0; i < nodeTransformer.length; i++) {
    let transform = nodeTransformer[i];
    transform(node);
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 如果是插值 需要 toDisplayString
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;
    default:
      break;
  }
}
function traverseChildren(node: any, context: any) {
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    traverseNode(node, context);
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransformer: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1);
    },
  };
  return context;
}
