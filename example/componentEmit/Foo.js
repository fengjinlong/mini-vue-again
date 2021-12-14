import { h } from "../../lib/guide-mini-vue.esm.js";
export const Foo = {
  setup(props, { emit }) {
    const emitAdd = () => {
      emit("add",1,6)
      emit("add-foo",2,5)
    };
    return {
      emitAdd,
    };
  },
  render() {
    const btn = h(
      "button",
      {
        onClick: this.emitAdd,
      },
      "emitAdd"
    );
    const foo = h("p", {}, "foo");

    return h("div", {}, [foo, btn]);
  },
};
