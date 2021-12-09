import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffect } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  public dep;
  private _rawValue: any;
  public __v_isRef = true;
  constructor(value) {
    // 存一下原始值，当value 为reactive时候使用
    this._rawValue = value;
    this._value = convert(value);
    this.dep = new Set();
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue: any) {
    // 如果value 是个reactive类型，那么需要用他的原始值作比较

    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue)
      // 必须是先修改在调用trigger
      convert(newValue)
      triggerEffect(this.dep);
    }
  }
}
function convert(value) {
  return isObject(value) ? reactive(value) : value;

}
export function ref(value) {
  return new RefImpl(value);
}
function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}
export function isRef(value) {
  return !!value.__v_isRef
}
export function unRef(value) {
  return !!value.__v_isRef ? value.value : value
}
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get (target, key) {
      return unRef(Reflect.get(target, key))
    },
    set (target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return target[key].value = value
      } else {
        return Reflect.set(target, key, value)
      }
    }
  })
}
