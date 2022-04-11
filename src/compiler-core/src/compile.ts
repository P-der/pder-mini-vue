import { generate } from "./generate";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformCompoundExpression } from "./transforms/transformCompoundExpression";
import { transformInterpolation } from "./transforms/transformInterpolation";
export function baseCompile(template) {
  const ast: any = baseParse(template);
  transform(ast, {
    nodeTransforms: [transformInterpolation, transformElement, transformCompoundExpression],
  });

  return generate(ast);
}
