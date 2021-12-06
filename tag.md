## 版本功能描述

### 1 reactive 模块

#### v0.0.1

1. 实现 reactive 的 api

- 测试用例

```js
describe("reactive", () => {
  it("happy path", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
  });
});
```

- 使用

```javascript
const user = reactive({
  age: 10,
});
// user 是响应式的
```

- 实现

```javascript
// 实际上就是对象的 代理，利用 Proxy
export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      let res = Reflect.get(target, key);
      // TODO 收集依赖
      // track(target, key)
      return res;
    },
    set(target, key, value) {
      let res = Reflect.set(target, key, value);
      return res;
    },
  });
}
```

2. 实现 effect 的初始第一次调用

- 测试

```javascript
it("happy path", () => {
   const user = reactive({
     age:10
   })
   let nextAge
   effect(() => {
     nextAge = user.age + 1
   })
expect(nextAge).toBe(11)
```

- 实现

```javascript
class ReactiveEffect {
 private _fn: any;
 constructor(fn) {
   this._fn = fn;
 }
 run() {
   this._fn()
 }
}
export function effect (fn) {
 const _effect = new ReactiveEffect(fn)
 _effect.run()
}
```

#### v0.0.3

1. 实现 effect 的依赖收集

```javascript
/**
 * 当effect 里面的数据更新时候，我们希望再执行一次 effect 的参数，也就是fn
 * 需要在触发数据响应式的get操作时候收集依赖,在set操作触发依赖
 * track(target, key)
 * 一个依赖集合的对印关系是这样，targetMap: { target：depsMap}, depsMap: {key, dep}
 * 最终 把当前的激活依赖 activeEffect，添加到 dep 里面，dep.add(activeEffect)
 * 初始定义一个activeEffect变量，当触发get操作，也就是effect的初始第一次执行run方法时候，
 * 此时this就是effect对象，将他赋值给activeEffect变量
 * 紧接着执行track 函数，里面执行dep.add(activeEffect),收集工作完成
 */

const targetMap = new Map();
export function track(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  dep.add(activeEffect);
}
```

2. 实现 effect 的依赖触发

```javascript
/**
 * set操作时候收集依赖
 * trigger(target, key)
 * 实际就是遍历出deps中的所以effect，执行effect.run()
 * run就是执行传给effect的参数fn
 */
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);

  for (const effect of dep) {
    effect.run();
  }
}
```

#### v0.0.4

- 当调用 effect 函数（参数为 fn）时候后返回一个函数 run，如果执行 run 则相当于再次执行 fn

1. 测试

```javascript
it("should return runner when call effect", () => {
  let foo = 10;
  const runner = effect(() => {
    foo++;
    return "foo";
  });
  expect(foo).toBe(11);
  const r = runner();
  expect(foo).toBe(12);
  expect(r).toBe("foo");
});
```

2. 实现

```javascript
/**
 * 在处理返回的 _effect.run 方法时候存在this指针问题
 * 用bind
 */
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  return _effect.run.bind(_effect);
}
```

#### v0.0.5

- effect 的第二个参数 {scheduler: ()=>{}}

1. 测试

```typescript
/**
 * 通过effect的第二个参数给定一个 scheduler 的 fn1
 * effect 第一次执行时候，还会执行一个参数 fn
 * 当触发响应式对象的 set update 操作时，不执行fn，而执行scheduler 的fn1
 * 当执行返回值 runner 时候，再次执行fn
 */
it("scheduler", () => {
  let dummy;
  let run: any;
  const scheduler = jest.fn(() => {
    run = runner;
  });
  const obj = reactive({ foo: 1 });
  const runner = effect(
    () => {
      dummy = obj.foo;
    },
    {
      scheduler,
    }
  );
  expect(scheduler).not.toHaveBeenCalled();
  expect(dummy).toBe(1);

  obj.foo++;
  expect(scheduler).toHaveBeenCalledTimes(1);
  expect(dummy).toBe(1);
  run();
  expect(dummy).toBe(2);
});
```

2. 实现

```javascript
export function effect(fn, options: any = {}) {
  // 传入第二个参数
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();
  return _effect.run.bind(_effect);
}

export function trigger(target, key) {
  // ...省略部分代码
  for (const effect of dep) {
  // 判断是否存在 scheduler，fn? fn1?
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run();
    }
  }
}

class ReactiveEffect {
  private _fn: any;
  // pbulic 是为了给外部获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
  }
  run() {}
}
```

#### v0.0.6

- stop

1. 测试

```javascript
it("stop", () => {
  let dummy;
  const obj = reactive({ prop: 1 });
  const runner = effect(() => {
    dummy = obj.prop;
  });
  obj.prop = 2;
  expect(dummy).toBe(2);

  stop(runner);
  // 如果stop 包裹这个reunner, 数据不再是响应式的，
  // 也就是说需要把 对应的effect 从 dep 里删掉
  // 根据单测，stop参数就是 effect 的返回值 runner
  obj.prop = 5;
  expect(dummy).toBe(2);

  // runner()
  // expect(dummy).toBe(3)
});
```

2. 实现

```javascript
/**
 * 有测试可得stop参数是runner
 */
export function stop(runner) {}
// 当调用stop方法时候，需要删掉响应式依赖
// 首相给effect添加stop方法
class ReactiveEffect {
  // ...
  stop() {}
  // ...
}
// stop 方法怎么能关联到effect的stop方法呢,这样干
export function effect(fn, options: any = {}) {
  // ...
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
// 这样stop方法就像个样子了
export function stop(runner) {
  runner.effect.stop();
}
// 接下来搞effect的stop方法
// 1个 dep 对应多个 effect,同一个effect可能存在多个dep里面
// 现在要清除所有 dep 里面的 目标effect，也就是先遍历depsMap得到dep，在delete每一个dep里面的effect
// 但是depsMap 与 effect不存在关联关系，也就是说当前的effect 不能关系到 所有的depsMap
// 这样处理，
/**
 * 1. dep 与 effect 的关系的 dep.add(effect)
 * 2. 我们给每一个effect 添加一个deps 的数组空间，用来存储谁 add 当前端的effect 了
 * 3. 那么，我们就能从effect 本身关联到与他有关的所有dep了，也就是 deps 数组
 * 4. 返回来，只要遍历当前的的efect的deps属性（deps这里面的每一个dep都存在effect），dep是Set，deps是数组
 * 5. effect.deps.forEach(dep => dep.delete(effect))
 */

class ReactiveEffect {
  // ...
  active = true;
  deps = [];
  stop() {
    if (this.active) {
      cleanUpEffect(this);
      this.active = false;
    }
  }
  // ...
}
export function track(target, key) {
  // ...
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
  // ...
}
function cleanUpEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
}
```

- onStop
#### v0.0.7
- readonly
1. 测试代码
2. 实现
```javascript
// 不需要收集依赖和触发依赖
// 未重构的原始代码
export function readonly(raw) {
  return new Proxy(raw, {
    get(target, key) {
      let res = Reflect.get(target, key);
      return res
    },
    set(target, key, value) {
      return true
    }
  })
}
```
