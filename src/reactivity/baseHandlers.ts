import { track, trigger } from "./effect";

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

function createGetter (isReadOnly=false) {
  return function get (target, key) {

      let res = Reflect.get(target, key);
      // TODO 收集依赖
      if (!isReadOnly) {

        track(target, key)
      }
      return res
  }
}
function createSetter () {
  return function set(target, key, value) {
      let res = Reflect.set(target, key, value);
      trigger(target, key)
      return res
    }
}

export const mutableHandles = {
  get,
  set,
}
export const readonlyHandles = {

    get: readonlyGet,
    set(target, key, value) {
    console.warn(`${key} 不能set，readonly！`)
     return true
    }
}
