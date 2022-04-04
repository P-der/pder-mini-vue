import { camelize, capitalize} from "../shared/index";

export function emit(instance, event, ...arg) {
    const {props} = instance
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    if(handler) {
        handler(...arg)
    }
}


export const toHandlerKey = (str: string) =>
    str ? `on${capitalize(str)}` : ``;
