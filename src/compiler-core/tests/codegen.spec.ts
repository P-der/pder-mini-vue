import { NodeTypes } from "../src/ast";
import { baseParse  } from "../src/parse";
import { transform } from '../src/transform'
import { transformCompoundExpression } from "../src/transforms/transformCompoundExpression";
import { transformElement } from "../src/transforms/transformElement";
import {  transformInterpolation } from "../src/transforms/transformInterpolation";
import { generate } from '../src/generate'

describe("codegen", () => {
  test("string", () => {
    const ast = baseParse("hi");
    transform(ast);
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  test("interpolation", () => {
    const ast = baseParse("{{message}}");
    transform(ast, {
      nodeTransforms: [transformInterpolation],
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  test("element", () => {
    const ast: any = baseParse("<div>hi,{{message}}</div>");
    transform(ast, {
      nodeTransforms: [transformInterpolation,transformElement, transformCompoundExpression],
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });
});
