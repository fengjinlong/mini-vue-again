export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  console.log(ast);
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
  console.log("ast---");
  console.log(ast.helpers.length);
  if (ast.helpers.length) {
    const aliasHelper = (s) => `${s}: _${s}`;
    push(
      `const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`
    );
    push("\n");
  }
  push("return ");
}

function genNode(node: any, context) {
  const { push } = context;
  push(`'${node.content}'`);
}

function createCodegenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
  };
  return context;
}
