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
