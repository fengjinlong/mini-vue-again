import {baseParse} from '../src/parse'
describe("Parse", () => {
  it("interpolation", () => {
    const ast = baseParse("{{message}}");
    expect(ast.children[0]).toStrictEqual({
      type: "interpolation",
      content: {
        type: "simple_expression",
        content: "message",
      },
    });
  });
});
