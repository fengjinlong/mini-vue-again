import { mutableHandles, readonlyHandles } from "./baseHandlers";

export function reactive(raw) {
  return createActionObject(raw, mutableHandles)
}
export function readonly(raw) {
  return createActionObject(raw, readonlyHandles)
}
function createActionObject(raw:any, baseHandlers: ProxyHandler<any>) {
  return new Proxy(raw, baseHandlers)
}