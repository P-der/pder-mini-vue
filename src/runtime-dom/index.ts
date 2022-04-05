// 源码里面这些接口是由 runtime-dom 来实现
// 这里先简单实现

import { isOn } from "../shared/index";
import { createRenderer } from "../runtime-core/render";

// 后面也修改成和源码一样的实现
function createElement(type) {
  const element = document.createElement(type);
  return element;
}

function createText(text) {
  return document.createTextNode(text);
}

function setText(node, text) {
  node.nodeValue = text;
}

function setElementText(el, text) {
  el.textContent = text;
}

function patchProp(el, key, newValue, oldValue) {
  if (isOn(key)) {
    let event = key.slice(2).toLowerCase()
    el.addEventListener(event, newValue)
} else {
    if(!newValue) {
      el.removeAttribute(key)
    }else {
      el.setAttribute(key, newValue)
    }
}
}

function insert(child, parent, anchor = null) {
  parent.insertBefore(child, anchor);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}



export const createApp = (root) => {
  return createRenderer({
    createElement,
    createText,
    setText,
    setElementText,
    patchProp,
    insert,
    remove,
  }).createApp(root);
};


export * from "../runtime-core/index";
