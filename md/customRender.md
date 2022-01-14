## 第一种情况，只基于 dom api 的 render

1. 用户调用 createApp

```ts
createApp(App).mount(rootContainer);
```

2. createApp

```ts
// 直接导出的 createApp
export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
```

3. render

```ts
export function render(vnode, container) {
  // dom api 创建元素
  const el = (vnode.el = document.createElement(vnode.type));
  // dom api 设置属性
  // ...
  // dom api 插入
  container.append(el);
}
```

## 第二种情况，基于用户传入 api 的 dom 的 customRenderer

1. 用户调用 createApp

```ts
createApp(App).mount(rootContainer);
```

2. createApp

```ts
// runtime-dom 里面的导出的 createApp
export function createApp(...args) {
  return renderer.createApp(...args);
}

const renderer: any = createRenderer({
  //下面的api 都是 dom的
  createElement,
  patchProp,
  insert,
});
```

3. createRenderer

```ts
export function createRenderer(options) {
  const { createElement, patchProp, insert } = options;

  function render(vnode, container) {
    // 同第一种情况的render相同了,相当只是提取了

    // dom api 创建元素
    createElement();
    // dom api 设置属性
    patchProp();
    // ...
    // dom api 插入
    insert();
  }

  // ...
  return {
    createApp: createAppAPI(render),
  };
}

function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContain) {
        const vnode = createVNode(rootComponent);
        render(vnode, rootContain);
      },
    };
  };
}
```

## 第二种情况拓展-基于用户传入的 api 的 customRenderer

#### 例子基于 canvas

1. 用户调用

```ts
renderer.createApp(App).mount(game.stage);
```

2. renderer

```ts
const renderer = createRenderer({
  // 用户传入的基于 canvas 的 api
  createElement(type) {
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xff0000);
      rect.drawRect(0, 0, 100, 100);
      rect.endFill();
      return rect;
    }
  },
  patchProp(el, key, val) {
    el[key] = val;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});

export function createRenderer(options) {
  const { createElement, patchProp, insert } = options;

  function render(vnode, container) {
    // canvas api 创建元素
    createElement();
    // canvas api 设置属性
    patchProp();
    // ...
    // canvas api 插入
    insert();
  }

  // ...
  return {
    createApp: createAppAPI(render),
  };
}
// 下面同第二种情况的 createApp 的逻辑了
function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContain) {
        const vnode = createVNode(rootComponent);
        render(vnode, rootContain);
      },
    };
  };
}
```

_总结_

- 基于 dom 的 createApp 是在 runtime-dom 里面导出的， render 函数使用的 api 是默认传入的
- 基于 canvas 的 createApp 是用户自定义的，用户需要定义一些 api，给 render 函数使用
