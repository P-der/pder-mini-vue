import { h } from "../../lib/mini-vue.esm.js";
// const count = ref(0);
const HelloWorld = {
  name: "HelloWorld",
  setup(props, {emit} ) {

    return {
      msg: props.count,
      handle() {
        console.log('emit add ')
        emit('add', 5)
      }
    }
  },
  // TODO 第一个小目标
  // 可以在使用 template 只需要有一个插值表达式即
  // 可以解析 tag 标签
  // template: `
  //   <div>hi {{msg}}</div>
  //   需要编译成 render 函数
  // `,
  render() {
    return h(
      "div",
      { tId: "helloWorld", onClick: this.handle },
      `hello world: msg: ${this.msg} `
    );
  },
};

export default {
  name: "App",
  setup() {
  },

  render() {
    return h("div", { tId: 1 , onClick() {
      // console.log('click')
    }}, [h("p", {}, "主页"), h(HelloWorld, {count: 1000, onAdd(){
      console.log('on add ')
    }})]);
  },
};
