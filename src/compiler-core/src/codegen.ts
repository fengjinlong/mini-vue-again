import { isString } from "../../shared";
import { NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_VNODE,
  helperMapName,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";

export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  // 导入逻辑 const { toDisplayString: _toDisplayString } = Vue
  genFunctionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(", ");
  push(`function ${functionName}(${signature}) {`);
  push("return ");
  genNode(ast.codegenNode, context);
  push("}");
  return {
    code: context.code,
  };
}
function genFunctionPreamble(ast, context) {
  const { push } = context;
  const VueBinging = "Vue";
  if (ast.helpers.length) {
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    push(
      `const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`
    );
    push("\n");
  }
  push("return ");
}

function genNode(node: any, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      // 处理文本 把内容返回
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      // 处理插值 _toDisplayString
      // node - { type: 0, content: { type: 1, content: 'message' } }
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
  }
}

function genCompoundExpression(node: any, context: any) {
  const { push } = context;
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isString(child)) {
      push(child);
    } else {
      genNode(child, context);
    }
  }
}
function genElement(node: any, context) {
  const { push, helper } = context;
  const { tag, children, props } = node;
  push(`${helper(CREATE_ELEMENT_VNODE)}(`);
  genNodeList(genNullable([tag, props, children]), context);
  // console.log(children);
  // [
  //   { type: 3, content: 'hi, ' },
  //   { type: 0, content: { type: 1, content: 'message' } }
  // ]

  // for (let i = 0; i < children.length; i++) {
  //   const child = children[i];
  //   genNode(child, context);
  // }
  // genNode(children, context);
  push(")");
}
function genNodeList(nodes, context) {
  const { push } = context;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
      push(node);
    } else {
      genNode(node, context);
    }

    if (i < nodes.length - 1) {
      push(", ");
    }
  }
}
function genNullable(args: any) {
  return args.map((arg) => arg || "null");
}
function genText(node, context: any) {
  const { push } = context;
  push(`'${node.content}'`);
}

function createCodegenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helperMapName[key]}`;
    },
  };
  return context;
}
function genInterpolation(node: any, context: any) {
  const { push, helper } = context;
  // push(`_toDisplayString(_ctx.message)`)
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(`)`);
}

function genExpression(node: any, context: any) {
  const { push } = context;
  push(`${node.content}`);
}
