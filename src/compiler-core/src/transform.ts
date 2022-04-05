export function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context)
    createRootCodegen(root)
}
function createRootCodegen(root: any) {
    root.codegenNode = root.children[0];
  }
function createTransformContext(root, options) {
    return {
        root,
        nodeTransforms: options.nodeTransforms || [],
    }    
}

function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        transform(node);
    }
    traverseChildren(node, context);
}
function traverseChildren(node: any, context: any) {
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}