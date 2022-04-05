import {baseParse, transform, generate } from "../index";

describe("codegen", () => {
  test("string", () => {
    const ast = baseParse("hi");
    transform(ast);
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  // it("interpolation", () => {
  //   const ast = baseParse("{{message}}");
  //   transform(ast, {
  //     nodeTransforms: [transformExpression],
  //   });
  //   const { code } = generate(ast);
  //   expect(code).toMatchSnapshot();
  // });
});
