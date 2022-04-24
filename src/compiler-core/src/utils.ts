import { NodeTypes } from "./ast";

export function isText(node) {
  return (node.nodeType =
    NodeTypes.TEXT || node.nodeType === NodeTypes.INTERPOLATION);
}
