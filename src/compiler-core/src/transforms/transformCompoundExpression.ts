import { NodeTypes } from "../ast";
import { isTextOrInterpolation } from "../utils";

export function transformCompoundExpression(node) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { children } = node;
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isTextOrInterpolation(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isTextOrInterpolation(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }

              currentContainer.children.push(" + ");
              currentContainer.children.push(next);
              children.splice(j, 1);
              j--;
            } else {
              currentContainer = undefined;
              break;
            }
          }
        }
      }
    };
  }
}