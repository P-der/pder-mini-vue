export const extend = Object.assign
export const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
export const camelize = (str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
};
export const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);