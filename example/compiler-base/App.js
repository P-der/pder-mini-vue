import { ref } from "../../lib/mini-vue.esm.js";

export const App = {
  name: "App",
  template: `<div>hi,{{count}}</div>`,
  setup() {
    const count = ref(1)
    window.text = count
    return {
      count,
    };
  },
};
