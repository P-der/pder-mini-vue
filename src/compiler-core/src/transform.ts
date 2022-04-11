import { NodeTypes } from "./ast";
import { CREATE_ELEMENT_VNODE, TO_DISPLAY_STRING } from "./runtimeHelpers";


export function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context)
    createRootCodegen(root)
    root.helpers = [...context.helpers];
}
function createRootCodegen(root: any) {
    root.codegenNode = root.children[0];
  }
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Set(),
        addHelper(key) {
            context.helpers.add(key);
        },
    } 
    return context   
}

function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns: any = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit) exitFns.push(onExit);
    }
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
          context.addHelper(TO_DISPLAY_STRING);
          break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            context.addHelper(CREATE_ELEMENT_VNODE)
          traverseChildren(node, context);
          break;
        default:
          break;
      }

      let i = exitFns.length;
      while (i--) {
        exitFns[i]();
      }
}
function traverseChildren(node: any, context: any) {
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}