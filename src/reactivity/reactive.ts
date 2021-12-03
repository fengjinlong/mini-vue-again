export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      let res = Reflect.get(target, key);
      // TODO 收集依赖
      // track(target, key)
      return res
    },
    set(target, key, value) {
      let res = Reflect.set(target, key, value);
      return res
    }
  })
}