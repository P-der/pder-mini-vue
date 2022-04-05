import { NodeTypes,TagType} from "./ast";

export function baseParse(content: string) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function createParserContext(content: string) {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        children,
        type: NodeTypes.ROOT
      };
}
function parseChildren(context, ancestors) {
    // {{ message }}
    let nodes: any[] = []
    let node 
    if(context.source.startsWith('{{')) {
       node = parseInterpolation(context)   
    }else if(context.source.startsWith('<')) {
        node = parseElement(context)
    }
    nodes.push(node)
    return nodes;
}
function parseElement (context) {
    const element: any = parseTag(context, TagType.Start);
    parseTag(context, TagType.End)
    return element
}
function parseTag(context, type) {
    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    advanceBy(context, match[0].length+1);
    const tag = match[1];
    if (type === TagType.End) return;
    return {
        type: NodeTypes.ELEMENT,
        tag,
        children: []
    }
}
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";

    const closeIndex = context.source.indexOf(
        closeDelimiter,
        openDelimiter.length
    );
    const rawContent = context.source.slice(openDelimiter.length, closeIndex)
    advanceBy(context, closeIndex + closeDelimiter.length)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: rawContent.trim(),
        },
    }
}
function advanceBy(context: any, length: number) {
    context.source = context.source.slice(length);
  }

