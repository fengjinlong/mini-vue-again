import { camelize, toHandlerKey } from "../shared/index"

export function emit(instance, event, ...arg) {
  const { props } = instance
  // add -> Add
  // add-add -> addAdd
 
  const handlerName = toHandlerKey(camelize(event))
  console.log(handlerName)
  const handler = props[handlerName]
  handler && handler(...arg)
}