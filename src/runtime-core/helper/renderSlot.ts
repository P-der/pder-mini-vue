import { h } from "../h";

export function renderSlot(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        // 参数是 props 
        const slotContent = slot(props); // 返回为h()[]
        return h('div', {}, slotContent);
    }
}