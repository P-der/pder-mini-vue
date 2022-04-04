import { h } from "../h";
import { Fragment } from "../render";

export function renderSlot(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // 参数是 props 
        const slotContent = slot(props); // 返回为h()[]
        return h(Fragment, {}, slotContent);
    }
}