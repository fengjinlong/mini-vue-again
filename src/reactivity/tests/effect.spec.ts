import { effect, stop } from "../effect";
import { reactive } from "../reactive";
describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age:10
    })
    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)
    
    // update
    user.age++
    expect(nextAge).toBe(12)
  });
  it('should return runner when call effect', () => {
    let foo = 10
    const runner = effect(() => {
      foo++
      return foo
    })
    expect(foo).toBe(11)
    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe(foo)
  })


  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {
        scheduler,
      }
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)

    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    expect(dummy).toBe(1)
    run()
    expect(dummy).toBe(2)
  })

  it("stop", () => {
    let dummy;
    const obj = reactive({prop: 1});
    const runner = effect(() => {
      dummy = obj.prop;
    })
    obj.prop = 2
    expect(dummy).toBe(2)

    stop(runner)
    // 如果stop 包裹这个reunner, 数据不再是响应式的，
    // 也就是说需要把 对应的effect 从 deps 里删掉
    // 根据单测，stop参数就是runner
    obj.prop = 5;
    expect(dummy).toBe(2)

    runner()
    expect(dummy).toBe(5)
  })
  it("onStop", () => {
    const obj = reactive({
      foo:1
    })
    const onStop = jest.fn();
    let dummy;
    const runner = effect(() => {
      dummy = obj.foo;
    }, {
      onStop
    })
    stop(runner)
    expect(onStop).toBeCalledTimes(1)
  })

});
