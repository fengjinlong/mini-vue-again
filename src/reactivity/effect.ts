import { extend } from "../shared";

class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true;
  onStop?: () => void;
  // pbulic 是为了给外部获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
  }
  run() {
    // this 就是依赖的,依赖的run 方法就是执行fn
    activeEffect = this;
    return this._fn();
  }
  stop() {
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
    if (this.active) {
      if (this.onStop) {
        this.onStop()
      }
      cleanUpEffect(this);
      this.active = false;
    }
  }
}
function cleanUpEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
}
let targetMap = new Map();
export function track(target, key) {
  // target key dep
  // 对象-- key -- 依赖
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
    
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  // console.log(depsMap)
  if (!activeEffect) return;
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
  // console.log(activeEffect)
}
let activeEffect;

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.onStop= options.onStop
  extend(_effect, options)
  _effect.run();

  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);

  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}
export function stop(runner) {
  runner.effect.stop();
  // 指向类 的stop方法
}
