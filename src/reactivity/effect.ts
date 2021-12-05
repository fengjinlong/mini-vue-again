class ReactiveEffect {
  private _fn: any;
  // pbulic 是为了给外部获取到
  constructor(fn, public scheduler?) {
    this._fn = fn;
  }
  run() {
    // this 就是依赖的,依赖的run 方法就是执行fn
    activateEffect = this;
    return this._fn();
  }
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
  dep.add(activateEffect);
}
let activateEffect;

export function effect(fn,options:any = {}) {
  const _effect = new ReactiveEffect(fn,options.scheduler);
  _effect.run();
  return _effect.run.bind(_effect);
}
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let deps = depsMap.get(key);

  for (const effect of deps) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {

      effect.run();
    }
  }
}
