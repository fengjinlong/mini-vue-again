export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any = [];
  const node = parseInterpolation(context);
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context: any) {
  // {{xxx}}
  const closeIndex = context.source.indexOf("}}", 2);
  context.source = context.source.slice(2);
  const rawContentLength = closeIndex - 2;
  const content = context.source.slice(0, rawContentLength);

  // delete }}
  context.source = context.source.slice(rawContentLength, 2);

  return {
    type: "interpolation",
    content: {
      type: "simple_expression",
      content: content,
    },
  };
}

function createRoot(children) {
  return {
    children,
  };
}
function createParserContext(context: any) {
  return {
    source: context,
  };
}
