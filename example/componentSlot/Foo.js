import { h, renderSlots } from "../../lib/guide-mini-vue.esm.js";
export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);

    // children 可以为string, array
    // children在这里应该是vnode，vnode只能是string或组件，如果是数组应该处理
    // return h("div", {}, [foo, this.$slots]);不能渲染
    // 所以这里要用一个vnode包裹一下
    // return h("div", {}, [foo, h("div", {}, this.$slots)]);
    // 优化一下

    // 带参数 作用域插槽
    return h("div", {}, [
      renderSlots(this.$slots, "header", {age: 18}),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
};
