import { NodeTypes } from "../ast";
import { CREATE_ELEMENT_VNODE } from "../runtimeHelpers";

export function transformElement(node) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
          // tag
          const vnodeTag = `'${node.tag}'`;
    
          // props
          let vnodeProps;
    
          // children
          const children = node.children;
          let vnodeChildren = children[0];
          node.codegenNode = {
            type: NodeTypes.ELEMENT,
            vnodeTag,
            vnodeProps,
            vnodeChildren,
          }
        };
      }
  }