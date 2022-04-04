const publicPropertiesMap = {
  // 当用户调用 instance.proxy.$emit 时就会触发这个函数
  // i 就是 instance 的缩写 也就是组件实例对象
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots
};

// todo 需要让用户可以直接在 render 函数内直接使用 this 来触发 proxy
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
      if(key in instance.setupState) {
        return instance.setupState[key]
      }else if(key in publicPropertiesMap) {
        return publicPropertiesMap[key](instance)
      }else if(key in instance.props) {
        return instance.props[key]
      }
  },
};
