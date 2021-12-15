import { h,createTextVNode } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const APP = {
  render() {
    const app = h("div", {}, "App");
    // 虚拟节点的children 赋值给slots
    // p标签
    // const foo = h(Foo,{},h("p", {}, "123"))

    // 数组
    // const foo = h(Foo, {}, [h("p", {}, "header"), h("p", {}, "footer")]);

    // 对象,具名插槽
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [
          h("p", {}, "header" + age),
          createTextVNode("text vnode"),
        ],
        footer: () => h("p", {}, "footer"),
      }
    );
    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};
