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
        newIndexToOldIndexMap[newIndex - s2] = i + 1;
        // 存在，继续进行深度对比
        patch(prevChild, c2[newIndex], container, parentComponent, null);
      }
    }
  }
}
