import { isReactive, isReadOnly, reactive, readonly } from "../reactive"

describe('test', () => {
  it('hhh', () => {
    const obj1 = readonly({})
    const obj2 = reactive({})

    expect(isReadOnly(obj1)).toBe(true)
    expect(isReadOnly(obj2)).toBe(false)
    expect(isReactive(obj2)).toBe(true)
    // expect(isReactive(obj1)).toBe(true)
  })
})