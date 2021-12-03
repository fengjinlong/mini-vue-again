import { track, trigger } from "./effect";

export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      let res = Reflect.get(target, key);
      // TODO 收集依赖
      track(target, key)
      return res
    },
    set(target, key, value) {
      let res = Reflect.set(target, key, value);
      trigger(target, key)
      return res
    }
  })
}