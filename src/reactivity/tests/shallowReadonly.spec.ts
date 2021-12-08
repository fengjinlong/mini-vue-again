import { isReadOnly, shallowReadonly } from "../reactive"
describe("shallowReadonly", () => {
  it("should not make non-reactive propertive reactive", () => {
    const props = shallowReadonly({
      n: {
        foo: 1
      }
    })
    expect(isReadOnly(props)).toBe(true)
    expect(isReadOnly(props.n)).toBe(false)
  })
})
