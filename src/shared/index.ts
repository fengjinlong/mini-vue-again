export const extend = Object.assign
export const isObject = (value) => {
  return value !== null && typeof value === "object";
};
export const hasChanged = (v1,v2) => {
  return !Object.is(v1,v2);
}