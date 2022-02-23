import { mutableHandles, readonlyHandles,shallowReadonlyHandles } from "./baseHandlers";
export const enum ReactiveFlegs {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isREADONLY'
}
// raw 生的
export function reactive(raw) {
  return createReactiveObject(raw, mutableHandles)
}
export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandles)
}
function createReactiveObject(raw:any, baseHandlers: ProxyHandler<any>) {
  return new Proxy(raw, baseHandlers)
}
export function isReadOnly(raw) {
  return !!raw[ReactiveFlegs.IS_READONLY]
}
export function isReactive(raw) {
  return !!raw[ReactiveFlegs.IS_REACTIVE]
}
export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandles)
}
export function isProxy (raw) {
  return isReadOnly(raw) || isReactive(raw)
}