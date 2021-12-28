import { h } from "../../lib/guide-mini-vue.esm.js";
export const Foo = {
  setup(props) {
    // 1 props.count
    console.log("props", props)

    // 2 this.count 访问

    // shallow readdonly
    // props.count++
  },
  render() {
    return h('p',{}, "foo "+ this.count)
  }
}