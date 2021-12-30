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
  effect.deps.length = 0;
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
      return res;
    },
    set(target, key, value) {
      return true;
    },
  });
}
```

#### v0.0.8

- isReadOnly

1. 测试

```javascript
const wrapped = readonly(orginal);
expect(isReadOnly(wrapped)).toBe(true);
```

2. 实现

```javascript
  /**
   * 调用isReadOnly 方法，其实就是return 读一个标记为只读的属性 key1
   * 在对应的get操作时，判断key 是否就是这个 key1
   * 如果是key1，返回get上，事先为了区分readonly这个api准备的标记字段，返回这个字段即可
  */
 export function isReadOnly(raw) {
  return !!raw[ReactiveFlegs.IS_READONLY]
}

function createGetter(isReadOnly: boolean = false, shallow = false): any {
  return function get(target, key) {
    if (key === ReactiveFlegs.IS_READONLY) {
      return isReadOnly
    }
    // ...
```

- isReactive

1. 思路和 readonly 大体相似

```javascript
export function isReactive (raw) {
  return !!raw[ReactiveFlegs.IS_REACTIVE]
}
function createGetter(isReadOnly: boolean = false, shallow = false): any {
  return function get(target, key) {
    if (key === ReactiveFlegs.IS_REACTIVE) {
      return !isReadOnly
    }
    // ...

```

- 优化 stop

1. 测试代码

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
  // bj.prop = 5 只执行一次set操作, 测试通过 ok
  // obj.prop = 5;

  /**
   * obj.prop++ 是先执行get 在执行set
   * 测试不通过，得到 3
   * 虽然stop()删除了依赖，但是由于再次触发get，也就是依赖再次通过track被收集，stop白删除依赖了
   * 当set时，触发trigger，所以测试失败
   * 处理：在track操作时候 需要添加判断逻辑
   */
  obj.prop++;
  expect(dummy).toBe(2);
});
```

2. 解决

```javascript
/**
 * 1 依赖收集是在effect(fn)第一次触发参数fn方法的时候
 * 2 也就是effect调用自身的run方法
 * 3 在run方法里面添加逻辑 判断是否需要收集依赖的操作
 * 4 咱们逆向推到一下，先说说track 方法收集逻辑是这样的
 *   if(dep.has(activeEffect)) return；
 *   dep.add(activeEffect);
 * 5 也就是说 如果 activeEffect 是undefined 那么就不会添加依赖
 * 6 也就是在执行run方法时候，activeEffect = this;
 * 7 不要给activeEffect 赋this值就不会添加依赖
 * 8 第一种不添加依赖情况，当执行完stop，有个控制防止stop多次调用的active
 * 9 当active为false时，run方法直接放回第一次调用的函数fn，不用收集依赖
 * 10 也就是不用执行 activeEffect = this;
*/
  run() {
    if (!this.active) {
      // 不应该收集依赖
      // 如果调用了stop，active 为 false
      // 只调用第一次的 _fn, 不进行下面的依赖赋值，也就是不进行依赖收集的 track 操作
      return this._fn()
    }
    // ...
  }
  /**
   * 11 第二次不收集依赖的情况，也就是解决 ++ 操作后stop失效
   * 12 思路是这样的，如果收集过后，即使被删除了，那么也不用再次收集，添加一个标记变量shouldTrack
  */

//  操作这个变量
let shouldTract;

 run() {
    if (!this.active) {
      return this._fn();
    }
    shouldTrack = true;
    // 应该收集
    activeEffect = this;
    const r = this._fn();
    // 重置
    shouldTrack = false;
    return r;
  }

  // 判断
  function track (target, key) {
    if (!shouldTrack) return
    // ...省略部分代码
  }
```

#### v0.0.9

1. 嵌套的 readonly reactive

- 测试

```javascript
it("nested reactive", () => {
  const orginal = {
    nested: {
      foo: 1,
    },
    array: [
      {
        bar: 2,
      },
    ],
  };

  const observed = reactive(orginal);
  expect(isReactive(observed)).toBe(true);
  expect(isReactive(observed.nested)).toBe(true);
  expect(isReactive(observed.array)).toBe(true);
  expect(isReactive(observed.array[0])).toBe(true);
});
```

- 实现

```javascript
function createGetter(isReadOnly = false) {
  return function get(target, key) {
    // ...
    let res = Reflect.get(target, key);
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res);
    }
    // ...
  };
}
```

2. shallowReadonly

- 测试

```javascript
/**
 * 同时具备 readonly 和 shallow特性
 * 所以要具备readonly的handles
 *
 */
  it("should not make non-reactive propertive reactive", () => {
    const props = shallowReadonly({
      n: {
        foo: 1
      }
    })
    expect(isReadOnly(props)).toBe(true)
    expect(isReadOnly(props.n)).toBe(false)
  })Î
```

- 实现

```javascript
export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandles);
}
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});
const shallowReadonlyGet = createGetter(true, true);

function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlegs.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key === ReactiveFlegs.IS_READONLY) {
      return isReadOnly;
    }
    let res = Reflect.get(target, key);
    if (shallow) {
      // 直接返回
      return res;
    }
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res);
    }
    // TODO 收集依赖
    if (!isReadOnly) {
      track(target, key);
    }
    return res;
  };
}
```

3. isProxy

#### v0.0.10

1. ref

- 测试

```javascript
it("happy path", () => {
  const a = ref(1);
  expect(a.value).toBe(1);
});
it.only("should be reactive", () => {
  const a = ref(1);
  let dummy;
  let calls = 0;
  effect(() => {
    calls++;
    dummy = a.value;
  });
  expect(calls).toBe(1);
  expect(dummy).toBe(1);
  // a.value = 2;
  a.value++;
  expect(calls).toBe(2);
  expect(dummy).toBe(2);

  a.value = 2;
  expect(calls).toBe(2);
  expect(dummy).toBe(2);
});
it("should be nestes properties reactive", () => {
  const a = ref({
    count: 1,
  });
  let dummy;
  effect(() => {
    dummy = a.value.count;
  });
  expect(dummy).toBe(1);
  a.value.count = 2;
  expect(dummy).toBe(2);
});
```

- 实现思路

```javascript
/**
 * ref 接收的一个单值，比如 1 true '1'
 * 也就是说为什么 ref 的类型需要一个 ref.value 的操作？
 * 那么 proxy 怎么知道的get 和 set ？proxy 的参数是个对象，所以需要把单值转换为对象
 * 通过 RefImpl 类实现，里面有 value get set。
 * ref 是只有一个key（value）， 对应 唯一的dep
 *
*/

/**
 * reactive 的响应式是通过 targetMap -> depsMap -> dep 这样的对应关系
 * 但是ref 没有target，没有 key. 所以自身构建一个dep就可以了
 * 这个dep复用reactive 的与dep相关的tract和trigger操作逻辑
*/

class RefImpl {
  private _value: any;
  public dep;
  private _rawValue: any;
  public __v_isRef;
  constructor(value) {
    // 存一下原始值，当value 为reactive时候使用
    this._rawValue = value;
    this._value = convert(value);
    this.dep = new Set();
  }
  get value() {
    // 复用ractive的
    trackRefValue(this);
    return this._value;
  }
  set value(newValue: any) {
    // 如果value 是个reactive类型，那么需要用他的原始值作比较
   /**
     * 如果是对象的话
     * set 逻辑里面  hasChange(newValue, this._value) 一个是object，一个是isProxy，肯定不相等，所以这需要对比原始值
     * 原始值 _rawValue
     *
    */
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue)
      // 必须是先修改在调用trigger
      convert(newValue)
      // 复用ractive的
      triggerEffect(this.dep);
    }
  }
}
```

2. isRef

- 实现

```javascript
function isRef(v) {
  return !!v.__v_isRef;
}
```

3. unRef

```javascript
function unRef(value) {
  return !!value.__v_ ? value.value : value;
}
```

4. proxyRefs

- 实现

```javascript
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
```

#### v0.0.11

1. computed(fn)

- 测试

```javascript
describe("computed", () => {
  it("happy path", () => {
    // 类似ref类型，需要.value取值
    // 缓存

    const user = reactive({
      age: 1,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(1);
  });
  it("should computed lazily", () => {
    const value = reactive({
      foo: 1,
    });
    const getter = jest.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);

    // 测试 1
    // lazy
    /**
     * 如果没有调用 cValue 的话，getter 不会执行
     */
    expect(getter).not.toHaveBeenCalled();
    // 调用一次 cValue
    expect(cValue.value).toBe(1);
    // 触发一次函数
    expect(getter).toHaveBeenCalledTimes(1);

    // 再次调用
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // 测试 2
    value.foo = 2;

    // 测试 3 触发set 操作，同样不想再次调用一次getter()，不然缓存有什么用
    expect(getter).toHaveBeenCalledTimes(1);

    // 测试 4
    // // now it should computed
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // // // sgould not computed again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
```

- 实现

```javascript
import { ReactiveEffect } from "./effect";

/**
 * computed 接受一个函数
 * 返回一个类似ref的类型，也就是需要调用 .value 取值
 * 可以缓存
 * 缓存的原理就是通过设置一个标记_dirty,调用一次把值缓存_value，
 * 第二次调用不用触发getter(),直接把缓存的值_value返回
 */
class ComputedRefImpl {
  private _getter: any;
  private _dirty: boolean = true;
  private _value: any;
  private _effect: ReactiveEffect;

  /**
   * 结合测试1 看
   * 下面get value 实现了 .value, 缓存
   */
  // constructor(getter) {
  //   this._getter = getter;
  // }
  // get value() {
  //   if (this._dirty) {
  //     this._dirty = false;
  //     this._value = this._getter()
  //   }
  //   return this._value
  // }
  /**
   * 结合测试2 看
   * 当执行value.foo = 2 时候，由于 value 是响应式对象，所以触发set操作，也就是要进行trigger，但是
   * getter是一个函数，相当于effect(fn)中的fn，这里只是执行了，const cValue = computed(getter)
   * 并没有执行effect(getter),也就是没有进行依赖收集，trigger操作肯定报错
   * 所以我们要收集这个 fn ，也就是收集getter，改写ComputedRefImpl 的 get value() {}
   * 目标：收集 getter
   */
  // constructor(getter) {
  //   this._getter = getter;
  //   this._effect = new ReactiveEffect(getter);
  // }
  // get value() {
  //   if (this._dirty) {
  //     this._dirty = false;
  //     this._value = this._effect.run();
  //   }
  //   return this._value;
  // }
  /**
   * 结合测试2，测试3 看
   * 先执行 value.foo = 2;触发trigger,也就是遍历执行effect.run(),也就是又执行了一次getter()
   * 实际上getter() 有执行了一次
   * 所以 expect(getter).toHaveBeenCalledTimes(1) 失败，实际为 2
   * 怎么才能在trigger时候不执行run方法呢？想想effect(fn, scheduler), scheduler 的的作用
   * 当执行 triggerEffect 时候，effect.scheduler ？effect.scheduler() : effect.run()，
   * ok 随便给scheduler 一个值就行了
   *
   */
  //  export function triggerEffect(dep: any) {
  //   for (const effect of dep) {
  //     if (effect.scheduler) {
  //       effect.scheduler();
  //     } else {
  //       effect.run();
  //     }
  //   }
  // }

  // constructor(getter) {
  //   this._getter = getter;
  //   this._effect = new ReactiveEffect(getter, () => {});
  // }
  // get value() {
  //   if (this._dirty) {
  //     this._dirty = false;
  //     this._value = this._effect.run();
  //   }
  //   return this._value;
  // }

  /**
   * 结合测试2，测试3，测试4 看
   * 当原始reactive类型value改变后，value.foo = 2
   * 希望cValue.foo也改变，毕竟是响应式的
   * 测试4 取 cValue.foo 时候，触发 get value(){} 的操作，
   * 发现_dirty还锁着呢，_value 没有更新，问题在这里
   * 那什么时候打开_dirty 呢？
   * 没错就是他, schedulers !!!
   *
   */
  constructor(getter) {
    this._getter = getter;
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}
export function computed(getter) {
  return new ComputedRefImpl(getter);
}

```

### runtime 模块

#### v0.1.0

1. 初始化装箱，拆箱

- App

```typescript
export const App = {
  render() {
    return h("div", this.msg);
  },
  setup() {
    return {
      msg: "hello vue",
    };
  },
};
```

- createApp(App).mount("#app")

```typescript
// 创建 vnode
render(vnode, rootContainer); // 第一次执行render
// render -> patch
```

- patch(vnode, container);

```typescript
// vnode -> {
//	type,
//	props,
//	children
//}
// 这里patch的第一个参数是组件

// patch -> processComponent
```

- processComponent(vnode, container);

```typescript
// processComponent -> mountComponent
```

- mountComponent(vnode, container);

```typescript
// 1 创建instance实例
instance = createComponentInstance(vnode);

// 2 初始化，收集信息，instance挂载相关属性，方法, 装箱
setupComponent(instance);
// Component = instance.vnode.type;
// 最终为了得到这样的
// instance -> {
//   render: Component.render
//   setupState: Component.setup()
//   vnode: {
//     type: App
//   }
// }

// 3 渲染组件的render函数内部的element值，拆箱过程
setupRenderEffect(instance, container);
```

- setupRenderEffect(instance, container);

```typescript
const subTree = instance.render();
// subTree -> h("div", this.msg)
// 这里patch的参数是subTree

patch(subTree, container);
```

#### v0.1.1

1. rollup 安装

```
// rollup 依赖
rollup
tslib

// 因为用的ts，所以配置文件需要这个插件
@rollup/plugin-typescript
```

2. rollup.config.js 配置文件

```
import typescript from "@rollup/plugin-typescript"
export default {
  input: "./src/index.ts",
  output: [
    {
      format: "cjs",
      file: "lib/guide-mini-vue.cjs.js"
    },
    {
      format: "es",
      file: "lib/guide-mini-vue.esm.js"
    }
  ],
  plugins: [typescript()]
}
```

#### v0.1.2

1. 渲染组件和 element

- 根据 vnode.type 类型判断渲染 的是组件还是 element
- 如果是 element，包含初始化和更新环节
- 挂载流程从 vnode 拿到相应的初始数据 el,props(id,class),childred
- children 判断是 string 还是 array
- 如果是 array，再次循环 patch

#### v0.1.4

1. 如果获取组件的 this，也就是想拿到 children 的 this 值，有多种情况，我们暂时分为两大类

- 如果是 setupState 里面的值，只需要把 setup 的返回对象绑定到 render 函数即可
- this.$el 类型的

所以采用代理模式解决，让用户更方便使用 this 的值，setupState 情况从 setup 的返回值处理。$el 情况可以在创建 el 时候绑定到 vnode 上。

- 初始化时候创建代理对象 proxy

  ```typescript
  // $el
  function mountElement(vnode: any, container: any) {
    const el = (vnode.el) = document.createElement(vnode.type);
    // ...
  function setupRenderEffect(instance: any,vnode: any,container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> element -> mountElement
    patch(subTree, container);
    vnode.el = subTree.el
  }
  ```

  ```typescript
  function setupStatefulComponent(instance: any) {
    // 调用setup 函数，拿到setup函数的返回值

    const Component = instance.vnode.type;
    instance.proxy = new Proxy({}, {
      get(target, key) {
        // setupState 情况 (this.xxx, xxx是setup的返回对象的key)
        const {setupState} = instance;
        if (key in setupState) {
          return setupState[key];
        }
        // key -> $el
        if (key === "$el") {
          return instance.vnode.el
        }
      }
    })
    // ...
  ```

- 把代理对象绑定到 render 的 this 上

  ```typescript
  function setupRenderEffect(instance:any,vnode， container) {
    const {proxy} = instance;
    const subTree = instance.render.call(proxy)
    vnode.el = subTree.el
    // ...
  ```

#### v0.1.5

1. ShapeFlags 更高效的判断类型，可读性低

- 枚举类型

```typescript
export const enum ShapeFlags {
  ELEMENT = 1, // 0001 1
  STATEFUL_COMPONENT = 1 << 1, // 0010 2
  TEXT_CHILDREN = 1 << 2, // 0100 4
  ARRAY_CHILDREN = 1 << 3, // 1000 8
}
```

- 初始化 vnode

```typescript
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type), // 元素？组件？
    el: null,
  };

  // 下面为处理children准备，给vnode再次添加一个flag
  // 这里的逻辑是这样的
  /**
   * a,b,c,d 为二进制数
   * 如果 c = a | b，那么 c&b 和 c&a 后转为十进制为非0, c&d 后转为10进制为0
   * 得到 0 或者 非0 后就能应用在 判断逻辑
   *
   */
  if (typeof children === "string") {
    // 0001 | 0100 -> 0101
    // 0010 | 0100 -> 0110
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    // 0001 | 1000 -> 1001
    // 0010 | 1000 -> 1010
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN;
  }
  return vnode;
}
function getShapeFlag(type: any) {
  // vnode 是element元素 还是 组件 0001 0010
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
```

- 应用

```typescript
// if (typeof vnode.type === "string") {}
if (shapeFlag & ShapeFlags.ELEMENT) {
  // } else if (isObject(vnode.type)) {
} else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
}

// if (typeof children === "string")
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  // if (Array.isArray(children))
} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
}
```

#### v0.1.6

1. 事件

```typescript
for (let key in props) {
  let val = props[key];
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}
```

2. props

- 实现 setup(props)

```typescript
// 初始化
export function setupComponent(instance) {
  // ...
  // props
  initProps(instance, instance.vnode.props);
  // ...
}

// 挂载到instance
export function initProps(instance, rawProps) {
  instance.props = rawProps || {};
}

// 传给setup
const setupResult = setup(instance.props);
```

- 实现 this 访问 挂载到 instance

```typescript
export function initProps(instance, rawProps) {
  instance.props = rawProps || {};
}
```

- 实现只读

```typescript
const setupResult = setup(shallowReadonly(instance.props));
```

#### v0.1.7

1. emit

```typescript
// 使用
// 子组件
export const Foo = {
  setup(props, { emit }) {
    const emitAdd = () => {
      emit("add", 1, 6);
    };
    return {
      emitAdd,
    };
  },
  render() {
    const btn = h(
      "button",
      {
        onClick: this.emitAdd,
      },
      "emitAdd"
    );

    return h("div", {}, [btn]);
  },
};

// 父组件
h(Foo, {
  onAdd(a, b) {
    console.log("onAdd", a, b);
  },
});

// 由此可见
/**
 * emit 是 {setup} 的第二个参数,需要挂载到 instance上
 * 内部派发一个事件add,需要到组件的props找到对应onAdd属性，找到了就执行
 * 因为props需要在instance上获取，但是不用让用户传instance，所以用bind绑定第一个参数
 * 第一个参数是instance ， instance.emit = emit.bind(null, instance) as any;
 * 最后就是在props上进行匹配处理，add->onAdd add-foo->onAddFoo
 * 参入参数即可
 *
 */

const instance = {
  vnode,
  type: vnode.type,
  setupState: {},
  emit: () => {},
  props: {},
};
instance.emit = emit.bind(null, instance) as any;
const setupResult = setup(shallowReadonly(instance.props), {
  emit: instance.emit,
});
export function emit(instance, event, ...arg) {
  const { props } = instance;
  // add -> Add
  // add-add -> addAdd

  const handlerName = toHandlerKey(camelize(event));
  console.log(handlerName);
  const handler = props[handlerName];
  handler && handler(...arg);
}
```

#### v0.1.8

1. 插槽

#### v0.1.9

1. Fragment 只渲染 children 上一版本存在多渲染一个 div 的问题

```typescript
/**
 * vnode 类型只有string 组件
 * 要添加 Fragment 类型，只渲染 children
 * patch 后有个mountChildren(vnode, container),这样就可以实现了只渲染children
 * 因为默认有一个container
 *
 * */
export function renderSlots(slots, name, props) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {
      return createVNode(Fragment, {}, slot(props));
    }
  }
}

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type),
    el: null,
  };

  if (typeof children === "string") {
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN;
  }

  // slots children
  // 组件 + children object
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  }
  return vnode;
}

function patch(vnode: any, container: any) {
  // 当vnode.type的值时，组件是object，element是string，这样区分组件和元素
  const { type, shapeFlag } = vnode;
  switch (type) {
    case Fragment:
      processFragment(vnode, container);
      break;
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container);
      }
  }
}

function processFragment(vnode: any, container: any) {
  mountChildren(vnode, container);
}
```

#### v0.1.9

1. text 节点，同样不能渲染，因为 vnode 类型只有 元素类型的字符串(div, p, span)和组件类型和 Fragment

2. 需要给 vnode 添加一个创建 文本节点的方式

3. 应用

```typescript
export const APP = {
  render() {
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [
          h("p", {}, "header" + age),
          createTextVNode("text vnode"),
        ],
      }
    );
    return h("div", {}, [foo]);
  },
  setup() {
    return {};
  },
};
```

4. 实现

```typescript
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

// 虚拟节点的children就是 text
// patch 区分一下
function patch(vnode: any, container: any) {
  const { type, shapeFlag } = vnode;
  switch (type) {
    case Text:
      processText(vnode, container);
      break;
    //...

function processText(vnode: any, container: any) {
  const { children } = vnode;
  const text = document.createTextNode(children);
  container.append(text);
}
```

#### v0.1.10

1. getCurrentInstance

#### v0.1.11

1. provide 存

- key value 存在当前组件实例 instance 对象上
- 所以 provide inject 必须在 setup 里面调用

2. inject 取

- 取的时候到相应的父组件找 provide,所有找 parentComponent 是关键

3. instance 对象上挂载 parent 和 provides 属性

- 如果自身有 provides 那就指向父组件的 provides，但是如果自己的和父组件的 key 相同，那么父组件的就被覆盖了。
- 采用 js 原型链的方式解决这个问题，初始化 provides = currentInstance.provides = Object.create(parentProvides);
- 判断一下初始化时机 if (provides === parentProvides) {

4. inject

- 添加默认值情况

```typescript
import { getCurrentInstance } from "./component";

export function provide(key, value) {
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    let { provides } = currentInstance;
    const parentProvides = currentInstance.parent.provides;

    // 初始化
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}
export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
```

#### v0.1.12

1. 自定义渲染器 createRenderer

- 默认情况下，patch 过程中元素的创建 mountElement，属性的挂载，元素的插入都是基于 dom 的

```typescript
// 创建
const el = (vnode.el = document.createElement(vnode.type));
// 挂载属性
el.setAttribute(key, val);
// 插入元素
container.append(el);
```

- 如果脱离的 dom 平台，那么 patch 也就不能运行了。

- 所以需要一种 api，由用户根据不同平台，传入相应的元素创建修改等 api，用户不传只处理默认的 dom 的 api

- 将之前的 patch 抽离出来让用户自定义传入 相应的 元素的创建，属性修改，插入等 api

2. 之前的流程 (默认调用的事 dom 的 api)

```typescript
// 过程省略部分代码
// 用户创建应用
import { createApp } from "../../lib/guide-mini-vue.esm.js";
createApp(App).mount(rootContainer);

// createApp
function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}

// render
function render(vnode, container) {
  // patch
  patch(vnode, container, null);
}

// patch
function patch(vnode: any, container: any, parentComponent) {
  mountElement(vnode, container, parentComponent);
}

// mountElement
function mountElement(vnode: any, container: any, parentComponent) {
  // 创建dom
  const el = (vnode.el = document.createElement(vnode.type));
  // 添加方法与属性
  el.addEventListener(event, val);
  el.setAttribute(key, val);
  // 插入元素
  container.append(el);
}

// 到此dom的创建，更改属性，插入等操作完成
```

3. 用户定制传入相应 api 的流程

```typescript
// 过程省略部分代码

// 用户创建应用
renderer.createApp(App).mount(game.stage);

// renderer
export function createRenderer(options) {
  function render(vnode, container) {
    patch(vnode, container, null);
  }
  return {
    createApp: createAppAPI(render),
  };
}

// 用户创建应用也就是
createAppAPI(render)(App).mount(game.stage);

// createAppAPI
export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        render(vnode, rootContainer);
      },
    };
  };
}

// render
function render(vnode, container) {
  patch(vnode, container, null);
}

// patch
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProp,
    insert: hostInsert,
  } = options;
  function render(vnode, container) {
    patch(vnode, container, null);
  }
  function patch(vnode: any, container: any, parentComponent) {
    mountElement(vnode, container, parentComponent);
  }
  // mountElement
  function mountElement(vnode: any, container: any, parentComponent)
  // 用户传入创建元素api hostCreateElement
    const el = (vnode.el = hostCreateElement(vnode.type));
  // 用户传入的属性操作api
    hostPatchProp(el, key, val);
  // 用户传入的插入api
    hostInsert(el, container);
  }
}
// 到此，创建，属性操作，插入都是用户通过createRenderer(options) 传过来的

```

4. 调用方法

```typescript
// 拿 canvas 举例子
const renderer = createRenderer({
  // canvas 的创建
  createElement(type) {
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xff0000);
      rect.drawRect(0, 0, 100, 100);
      rect.endFill();
      return rect;
    }
  },
  // canvas 元素属性操作
  patchProp(el, key, val) {
    el[key] = val;
  },
  // canvas 元素插入
  insert(el, parent) {
    parent.addChild(el);
  },
});
// 调用
renderer.createApp(App).mount(game.stage);
```

#### v0.2.0

1. 区分更新流程

- demo

```typescript
  // 点击 btn，页面数据改变
  setup() {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };
    return {
      count,
      onClick,
    };
  },
  render() {
    return h(
      "div",
      {
        id: "root",
      },
      [
        h("div", {}, "count:" + this.count), // 依赖收集
        h(
          "button",
          {
            onClick: this.onClick,
          },
          "click"
        ),
      ]
    );
  },
```

- 页面数据的改变肯定是 虚拟节点 subTree 的改变，定位到 setupRenderEffect 函数

```typescript
function setupRenderEffect(instance: any, initialVNode: any, container) {
  const { proxy } = instance;
  // 保存一下第一次的虚拟节点
  const subTree = (instance.subTree = instance.render.call(proxy));
  // vnode -> element -> mountElement
  /**
   * 仅仅加上effect patch 会当初都是初始化的操作，所以需要添加区分初始化和更新
   * 给instance添加一个变量表示 isMounted
   */
  patch(null, subTree, container, instance);
  initialVNode.el = subTree.el;
}
```

- 数据变更，触发一下相应式就可以了，添加 effect。同时通过 inMounted 判断是初始化还是更新。
- 获取到 上一次的 subTree ，更新逻辑对比 两次的 subTree

```typescript
  function setupRenderEffect(instance: any, initialVNode: any, container) {
    effect(() => {
      if (instance.isMounted) {
        const { proxy } = instance;
        // 保存一下第一次的虚拟节点
        const subTree = (instance.subTree = instance.render.call(proxy));
        // vnode -> element -> mountElement
        /**
         * 仅仅加上effect patch 会当初都是初始化的操作，所以需要添加区分初始化和更新
         * 给instance添加一个变量表示 isMounted
         */
        patch(null, subTree, container, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = false;
      } else {
        const { proxy } = instance;
        // 新的虚拟节点
        const subTree = instance.render.call(proxy);
        // 上一个虚拟节点
        const prevSubTree = instance.subTree;
        // 更改保存的
        instance.subTree = prevSubTree;
        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  // patch processElement
  function patch(n1, n2: any, container: any, parentComponent) {
    processElement(...)
  }
  function processElement(n1, n2: any, container: any, parentComponent) {
    // 包含初始化和更新流程
    if (!n1) {
      // init
      mountElement(n2, container, parentComponent);
    } else {
      // update 逻辑
      patchElement(n1, n2, container);
    }
  }
```

#### v0.2.1

##### 分三种场景讨论 props 的变更

1. 第一种场景 修改 props 的属性 {foo: foo} -> {foo: new-foo}

```typescript
function patchElement(n1, n2, container) {
  // 获取新，老 prosp
  const oldProps = n1.props || {};
  const newProps = n2.props || {};
  // 对比新老props

  // 第二个要取代第一个
  const el = (n2.el = n1.el);
  patchProps(el, oldProps, newProps);
}

function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    // 对比props对象的属性
    const prveProp = oldProps[key];
    const nextprop = newProps[key];
    if (prveProp !== nextprop) {
      // 调用之前的 添加属性方法,需要一个 el
      // 多传一个参数，同时需要修改 hostPatchProp 方法
      hostPatchProp(el, key, prveProp, nextprop);
      /**
       * 这里是更新逻辑
       * 当初始化时候这样调用 hostPatchProp(el, key, null, val);
       */
    }
  }
}
// hostPatchProp -> patchProp
function patchProp(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    el.setAttribute(key, nextVal);
  }
}
```

2. 第二种场景 给某一个 prop 赋值为 null 或 undefined {foo: foo} -> {foo: undefined},那么直接删掉

```typescript
function patchProp(el, key, prevVal, nextVal) {
  if (nextVal === undefined || nextVal === null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, nextVal);
  }
}
```

3. 第三种场景, 旧的 props 里面有 prop 而新的没有，需要删掉旧的里面的 prop

```typescript
function patchProps(el, oldProps, newProps) {
  // ...
  // oldProps 里的 prop 不在 newProps 里面，遍历旧的
  for (const key in oldProps) {
    if (!(key in newProps)) {
      hostPatchProp(el, key, oldProps[key], null);
    }
  }
}
```

#### v0.2.2

##### diff 更新 children，分四种情况。children 只有两种类型，文本，数组

| 情况 | 老节点 | 新节点 |
| ---- | ------ | ------ |
| 1    | array  | text   |
| 2    | text   | text   |
| 3    | text   | array  |
| 4    | array  | array  |

1. 第一种情况

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/1.png?raw=true)

```typescript
/**
 *
 * 1 新的是text，老的是array
 * 2 删除老的array 添加 文本节点
 *
 */
function patchChildren(n1, n2, container, parentComponent) {
  const c1 = n1.children;
  const { shapeFlag } = n2;
  const c2 = n2.children;
  const prevshapeFlag = n1.shapeFlag;

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevshapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 1 把老的 children 删除
      unmountChildren(n1.children);
      // 2 添加 text
      hostSetElementText(container, c2);
    }
  }
}
```

2. 第二种情况

```typescript
/**
 * 1 新的 老的都是 文本节点
 * 2 对比是否相同，不相同的话 替换老的节点
 *
 */
function patchChildren(n1, n2, container, parentComponent) {
  // ...
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevshapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 1
    } else {
      // 2
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    }
  } else {
    // 3
  }
}
```

3. 第三种情况

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/2.png?raw=true)

```typescript
function patchChildren(n1, n2, container, parentComponent) {
  // ...
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevshapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 1
    } else {
      // 2
    }
  } else {
    // 3
    if (prevshapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(container, "");
      mountChildren(c2, container, parentComponent);
    }
  }
}
```

4. 第四种情况 array diff array

#### v0.2.3

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/3.png?raw=true)

##### array diff array 双端对比算法

1. 第一种情况 对比左侧相同

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/4.png?raw=true)

- demo

```typescript
// (a b) c
// (a b) d e

const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
];
```

- 相同节点的判定

```typescript
function isSameNodeType(n1, n2) {
  // 相同节点 type key 相同
  return n1.type === n2.type && n1.key === n2.key;
}
```

- 实现

```typescript
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // 初始指针 i
  let i = 0;
  let l2 = c2.length;
  // 新数组
  let e1 = c1.length - 1;
  // 老数组
  let e2 = l2 - 1;

  // 初始指针不能超过两个数组
  /**
   * 第一种情况
   * 左侧对吧
   * ab c
   * ab de
   */
  while (i <= e1 && i <= e2) {
    // 确定了 i 位置
    const n1 = c1[i];
    const n2 = c2[i];

    if (isSameNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent, parentAnthor);
    } else {
      break;
    }
    i++;
  }

  // 到此位置，已经对比并更新完 左侧相同的节点 ab
}
```

2. 第二种情况 对比右侧相同的

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/5.png?raw=true)

- dome

```typescript
// a (b c)
// d e (b c)
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
const nextChildren = [
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
```

- 实现

```typescript
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // ...

  /**
   * 第二种情况
   * 右侧对比
   * a bc
   * de bc
   */
  while (i <= e1 && i <= e2) {
    // 确定了 e1 e2 的位置

    const n1 = c1[e1];
    const n2 = c2[e2];

    if (isSameNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent, parentAnthor);
    } else {
      break;
    }
    e1--;
    e2--;
  }
  // 到此位置，已经对比并更新完 右侧侧相同的节点 bc
  // 左右都完毕，下面就是对比 中间的不同节点
  // 这也是 双端对比的 方法，先处理两边相同的节点（简单），然后在处理中间不同的（复杂）

  // ...
}
```

3. 第三种情况 新的比老的长 创建新的

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/6.png?raw=true)
![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/7.png?raw=true)

- demo

```typescript
// 分左右两种情况

// 左侧
// (a b)
// (a b) c
// i = 2, e1 = 1, e2 = 2
const prevChildren = [h("p", { key: "A" }, "A"), h("p", { key: "B" }, "B")];
const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];

// 右侧
//   (a b)
// c (a b)
// i = 0, e1 = -1, e2 = 0
const prevChildren = [h("p", { key: "A" }, "A"), h("p", { key: "B" }, "B")];
const nextChildren = [
  h("p", { key: "C" }, "C"),
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
];
```

- 实现

```typescript
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // ...
  // 新
  let l2 = c2.length;

  /**
   * 第三种情况
   * 新的比老的多,两种情况
   * ab        ab
   * ab c    c ab
   *
   * 左 i = 2, e1 = 1, e2 = 2
   * 右 i = 0, e1 = -1, e2 = 0
   *
   */
  if (i > e1) {
    if (i <= e2) {
      const nextPos = i + 1;
      const antor = i + 1 > l2 ? null : c2[nextPos].el;
      while (i <= e2) {
        // 左 antor为 null，所以在最后插入 c2[i]
        // 右 antor为 c2[1].el，所以在最后插入 c2[1].el 之前插入 c2[i]
        patch(null, c2[i], container, parentComponent, antor);
        i++;
      }
    }
  }
  // ...
}
```

4. 第四种情况 老的比新的长 删除多余的老的

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/8.png?raw=true)
![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/9.png?raw=true)

- demo

```typescript
// 分左右两种情况
// 左侧
// (a b) c
// (a b)
// i = 2, e1 = 2, e2 = 1
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
const nextChildren = [h("p", { key: "A" }, "A"), h("p", { key: "B" }, "B")];

// 右侧
// a (b c)
// (b c)
// i = 0, e1 = 0, e2 = -1

const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
const nextChildren = [h("p", { key: "B" }, "B"), h("p", { key: "C" }, "C")];
```

- 实现

```typescript
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // ...

  if (i > e1) {
    // 第三种情况
  } else if (i > e2) {
    /**
     * 第四种情况
     * 新的比老的少, 两种情况
     * ab c    a bc
     * ab        bc
     */
    while (i <= e1) {
      hostRemove(c1[i].el);
      i++;
    }
  } else {
  }

  // ...
}
```

5. 第五种情况 对比中间的部分（分三种情况）

**第 1 种情况 老的有，新的没有，删除老节点多余的**

- demo

```typescript
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C", id: "c-prev" }, "C"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "C", id: "c-next" }, "C"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];
```

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/10.png?raw=true)

- 实现

```typescript
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // ...

  if (i > e1) {
    // 第三种情况
  } else if (i > e2) {
    // 第四种情况
  } else {
    /**
     * 第五种情况-1。删除老的d，修改c
     * 旧 ab cd fg
     * 新 ab ec fg
     * 1 旧的里面存在，新的不存在（d），那么需要删除 d。
     * 如果在ec里面遍历看是否存在d，那么时间复杂度是O(n),如果用 key 映射，那么时间复杂度是O(1)
     *
     */

    /**
     * 根据新的节点建立关于key的映射关系 keyToNewIndexMap
     * 在老的节点里根据key查找是否存在值，也就是是否存在 keyToNewIndexMap[oldChild.key]
     * 存在说明是相同节点，拿到索引，进行深度 patch，不存在直接在老的节点里删除
     * 注意：老的节点可能是用户没有写key属性，那只能 for 遍历了
     *
     */

    // s1 s2 新老节点中间不同的起始位置
    let s1 = i;
    let s2 = i;

    // 映射关系
    const keyToNewIndexMap = new Map();
    // 新的映射关系
    for (let i = s2; i <= e2; i++) {
      const nextChild = c2[i];
      keyToNewIndexMap.set(nextChild.key, i);
    }

    for (let i = s1; i <= e1; i++) {
      // 老节点 prevChild
      const prevChild = c1[i];

      let newIndex;
      /**
       *  如果 newIndex 存在，说明 prevChild 在新的里面存在。
       *  如果用户写了key，用key映射查找。如果没写key,用循环查找
       */
      if (prevChild.key !== null) {
        newIndex = keyToNewIndexMap.get(prevChild.key);
      } else {
        for (let j = s2; j <= e2; j++) {
          if (isSameNodeType(c2[j], prevChild)) {
            newIndex = j;
            break;
          }
        }
      }

      if (newIndex === undefined) {
        // 说明不存在prevChild，删掉老的 prevChild
        hostRemove(prevChild.el);
      } else {
        // 存在，继续进行深度对比
        patch(prevChild, c2[newIndex], container, parentComponent, null);
      }
    }
  }

  // ...
}
```

- 优化点

![](https://github.com/fengjinlong/tuchuang/blob/master/vuediff/11.png?raw=true)

```typescript
/**
 * 优化点：当新节点的个数小于老节点点个数，也就是新的已经patch完毕，但是老节点还存在，那么老节点剩下的无需在对比，直接删除
 * 老 ab cedm fg，新 ab ec fg,当新节点的ec对比完毕，老节点还剩dm，那么直接删除，无需对比
 *
 * toBePatched 新节点需要patch的个数
 * patched 已经处理的个数
 *
 */
function pathKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
  // ...

  if (i > e1) {
    // 第三种情况
  } else if (i > e2) {
    // 第四种情况
  } else {
    let s1 = i;
    let s2 = i;
    const toBePatched = e2 - s2 + 1;
    let patched = 0;

    // 映射关系
    const keyToNewIndexMap = new Map();

    // 新的映射关系
    for (let i = s2; i <= e2; i++) {
      const nextChild = c2[i];
      keyToNewIndexMap.set(nextChild.key, i);
    }

    // 老的映射关系
    for (let i = s1; i <= e1; i++) {
      // 老节点 prevChild
      const prevChild = c1[i];
      if (patched >= toBePatched) {
        // 新的已经对比完，但是老的还没完事。直接删除
        hostRemove(prevChild.el);
        // 进入下一次循环
        continue;
      }
      let newIndex;
      /**
       *  如果 newIndex 存在，说明 prevChild 在新的里面存在。
       *  如果用户写了key，用key映射查找。如果没写key,用循环查找
       */
      if (prevChild.key !== null) {
        newIndex = keyToNewIndexMap.get(prevChild.key);
      } else {
        for (let j = s2; j <= e2; j++) {
          if (isSameNodeType(c2[j], prevChild)) {
            newIndex = j;
            break;
          }
        }
      }

      if (newIndex === undefined) {
        // 说明不存在prevChild，删掉老的 prevChild
        hostRemove(prevChild.el);
      } else {
        // 存在，继续进行深度对比
        patch(prevChild, c2[newIndex], container, parentComponent, null);
      }
    }
  }
  // ...
}
```

**第 2 种情况 新老都有，需要移动插入**

```typescript
function pathKeyedChildren() {
  // ...
}
```

**第 3 种情况 创建节点**

```typescript
if (newIndexToOldIndexMap[i] === 0) {
  // 创建逻辑
  patch(null, nextChild, container, parentComponent, anchor);
}
```

#### v0.2.4

1. 组件自己的 props 更新

- demo

```typescript
// 子组件 Child
export default {
  name: "Child",
  setup(props, { emit }) {},
  render(proxy) {
    return h("div", {}, [
      h("div", {}, "child - props - msg: " + this.$props.msg),
    ]);
  },
};

// 父组件

export const App = {
  name: "App",
  setup() {
    const msg = ref("123");
    const changeChildProps = () => {
      msg.value = "456";
    };
    return { msg, changeChildProps, changeCount };
  },

  render() {
    return h("div", {}, [
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      h(Child, {
        msg: this.msg,
      }),
    ]);
  },
};
```

- 实现

```typescript
// 组件更新实际是再次调用render函数,重新生成vnode，重新patch，也就是走 setupRenderEffect 逻辑
updateComponent(n1, n2);
function updateComponent(n1, n2) {
  // 利用effect runner 逻辑
  /**
   * 怎么找instance，现在只有n 虚拟节点
   * 那么把实例挂载到虚拟节点
   *
   */

  const instance = (n2.component = n1.component);
  instance.next = n2;

  instance.update();
}

function setupRenderEffect(instance: any, initialVNode, container, anchor) {
  instance.update = effect(() => {
    if (!instance.isMounted) {
    } else {
      console.log("update 更新");

      // next 新的虚拟节点
      // vnode 老的虚拟节点
      const { next, vnode } = instance;
      // 更新props 属性
      // 获取新的虚拟节点
      // 根据虚拟节点更新el
      if (next) {
        next.el = vnode.el;
        // 更新属性
        updateComponentPreRender(instance, next);
      }

      const { proxy } = instance;
      const subTree = instance.render.call(proxy);
      const prevSubTree = instance.subTree;
      instance.subTree = subTree;

      patch(prevSubTree, subTree, container, instance, anchor);
    }
  });
}

function updateComponentPreRender(instance, nextVNode) {
  // 更新实例的虚拟节点
  instance.vnode = nextVNode;
  instance.next = null;

  // 更新props
  instance.props = nextVNode.props;
}
```

2. 组件的 el 更新，跟 el 同级别的组件不需要走更新逻辑

- demo

```typescript
import { h, ref } from "../../lib/guide-mini-vue.esm.js";
import Child from "./Child.js";

export const App = {
  name: "App",
  setup() {
    const count = ref(1);
    const changeCount = () => {
      count.value++;
    };
    return { count };
  },

  render() {
    return h("div", {}, [
      h(Child, {
        msg: this.msg,
      }),
      h(
        "button",
        {
          onClick: this.changeCount,
        },
        "change self count"
      ),
      h("p", {}, "count: " + this.count),
    ]);
  },
};
```

- 实现

```typescript
// 优化点: 需要判断是否需要更新
// 如果调用组件内的元素更新，同级别的子组件不用更新，但是触发了组件更新逻辑
// 通过判断组件的 新老 props 是否一样 决定是否更新

function updateComponent(n1, n2) {
  // 利用effect runner 逻辑
  /**
   * 怎么找instance，现在只有n 虚拟节点
   * 那么把实例挂载到虚拟节点
   *
   */

  const instance = (n2.component = n1.component);
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2;
    instance.update();
  } else {
    // 不需要更新也要重置虚拟节点 和 el
    n2.el = n1.el;
    n2.vnode = n2;
  }
}
export function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode;
  const { props: nextProps } = nextVNode;

  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }
  return false;
}
```
