import { ref } from "../../lib/guide-mini-vue.esm.js";

export const App = {
  name: "App",
  template: `<div>hi,{{count}}, {{message}}</div>`,
  // template: `<div>hi,{{message}}</div>`,
  setup() {
    const count = (window.count = ref(1));
    return {
      count,
      message: "mini-vue",
    };
  },
};
