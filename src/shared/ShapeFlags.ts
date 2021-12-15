export const enum ShapeFlags {
  ELEMENT = 1, // 0001 1
  STATEFUL_COMPONENT = 1 << 1, // 0010 2
  TEXT_CHILDREN = 1 << 2, // 0100 4
  ARRAY_CHILDREN = 1 << 3, // 1000 8
  SLOTS_CHILDREN = 1 << 4, // 10000 16
}