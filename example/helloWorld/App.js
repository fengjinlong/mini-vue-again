import { h,ref } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";
window.self = null;
export const App = {
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["red hard"],
        onClick: this.click1,
      },
      // children 是string
      "hi " + this.msg
      // childred 是 array
      // [h("p",{class: "red"}, "hi p"), h("h3",{class: "green"}, "hi h3")]
      // props
      // [h("div", {}, "hi " + this.msg), h(Foo, { count: 1 })]
    );
  },
  setup() {
    const msg = ref('1')
    const click1 = () => {
      console.log("6666");
      msg.value = msg.value+1
    }


    return {
      click1,
      msg,
    };
  },
};
