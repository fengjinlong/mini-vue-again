import { isProxy, isReactive, reactive } from "../reactive";
describe("reactive", () => {
  it("happy path", () => {
    const original = {foo: 1}
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1) 
    expect(isProxy(observed)).toBe(true)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
    original.foo = 2
    expect(observed.foo).toBe(2)
  });
  it("nested reactive", () => {
    const orginal = {
      nested: {
        foo: 1
      },
      array: [
        {
          bar: 2
        }
      ]
    }

    const observed = reactive(orginal)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.array)).toBe(true)
    expect(isReactive(observed.array[0])).toBe(true)
  })
});
