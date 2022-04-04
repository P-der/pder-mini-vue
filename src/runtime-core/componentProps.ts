
import { isObject } from "../shared/index";

export function initProps(instance, props) {
    if(!isObject(props)) {
        return
    }
    instance.props = props
}