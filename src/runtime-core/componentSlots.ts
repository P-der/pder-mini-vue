import { ShapeFlags } from "../shared/shapeFlags";

export function initSlots(instance, children) {
  const { vnode } = instance;
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    normalizeObjectSlots(children, instance.slots);
  }
}

const normalizeSlotValue = (value) => { // 统一返回格式为数组
  return Array.isArray(value) ? value : [value];
};

const normalizeObjectSlots = (rawSlots, slots) => {
  for (const key in rawSlots) {
    const value = rawSlots[key];
    if (typeof value === "function") {
      slots[key] = (props) => normalizeSlotValue(value(props));
    }
  }
};
