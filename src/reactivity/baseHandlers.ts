import { extend, isObject } from "../shared/index";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlegs, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlegs.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlegs.IS_READONLY) {
      return isReadOnly;
    }
    let res = Reflect.get(target, key);
    if (shallow) {
      return res
    }
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res);
    }
    // TODO 收集依赖
    if (!isReadOnly) {
      track(target, key);
    }
    return res;
  };
}
function createSetter() {
  return function set(target, key, value) {
    let res = Reflect.set(target, key, value);
    trigger(target, key);
    return res;
  };
}

export const mutableHandles = {
  get,
  set,
};
export const readonlyHandles = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`${key} 不能set，readonly！`);
    return true;
  },
};
export const shallowReadonlyHandles = extend({}, readonlyHandles, {
  get: shallowReadonlyGet,
});
