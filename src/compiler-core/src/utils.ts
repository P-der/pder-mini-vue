import { NodeTypes } from "./ast";

export const isTextOrInterpolation = (node) => node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION