import { h } from "../../lib/guide-mini-vue.esm.js";
export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
        class: ["red hard"],
      },
      // children 是string
      // "hi " + this.msg
      // childred 是 array
      [h("p",{class: "red"}, "hi p"), h("h3",{class: "green"}, "hi h3")]
    );
  },
  setup() {
    return {
      msg: "hello vue",
    };
  },
};
