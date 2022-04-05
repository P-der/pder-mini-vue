import { NodeTypes, TagType } from "./ast";

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
    let nodes: any[] = []
    let node
    while (!isEnd(context, ancestors)) {
        if (context.source.startsWith('{{')) {
            node = parseInterpolation(context)
        } else if (context.source.startsWith('<')) {
            node = parseElement(context, ancestors)
        } else {
            node = parseText(context);
        }
        nodes.push(node)
    }
    return nodes;
}
function isEnd(context, ancestors) {
    let source = context.source
    if (context.source.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i];
            if (startsWithEndTagOpen(source, tag)) {
                return true;
            }
        }

    }
    return !context.source
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = context.source.slice(0, endIndex);

    advanceBy(context, endIndex);
    return {
        type: NodeTypes.TEXT,
        content
    }
}
function parseElement(context, ancestors) {
    const element: any = parseTag(context, TagType.Start);

    ancestors.push(element.tag)

    element.children = parseChildren(context, ancestors);
    ancestors.pop()

    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.End);
    } else {
        throw new Error(`缺失结束标签：${element.tag}`);
    }

    return element
}

function startsWithEndTagOpen(source, tag) {
    return (
        source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
    );
}
function parseTag(context, type) {
    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    advanceBy(context, match[0].length + 1);
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