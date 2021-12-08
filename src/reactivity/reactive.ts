import { mutableHandles, readonlyHandles,shallowReadonlyHandles } from "./baseHandlers";
export const enum ReactiveFlegs {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isREADONLY'
}

export function reactive(raw) {
  return createActionObject(raw, mutableHandles)
}
export function readonly(raw) {
  return createActionObject(raw, readonlyHandles)
}
function createActionObject(raw:any, baseHandlers: ProxyHandler<any>) {
  return new Proxy(raw, baseHandlers)
}
export function isReadOnly(raw) {
  return !!raw[ReactiveFlegs.IS_READONLY]
}
export function isReactive(raw) {
  return !!raw[ReactiveFlegs.IS_REACTIVE]
}
export function shallowReadonly(raw) {
  return createActionObject(raw, shallowReadonlyHandles)
}
export function isProxy (raw) {
  return isReadOnly(raw) || isReactive(raw)
}