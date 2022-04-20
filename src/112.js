function fun(arr) {
  let maxArrIndex = [];

  // 起始点
  for (let i = 0; i < arr.length; i++) {
    // 从i出发，第一个递增子数组
    const list = [];
    // i< arr.length 可以优化

    let j = i;
    while (j < arr.length && arr[j] <= arr[j + 1]) {
      list.push(j);
      j++;
    }
    list.push(j);

    if (list.length > maxArrIndex.length) {
      maxArrIndex = [];
      for (t = 0; t < list.length; t++) {
        maxArrIndex.push(list[t]);
      }
    }
  }
  console.log(maxArrIndex);
}
const arr = [3, 2, 5, 1, 2, 3];
fun(arr);
// 最长递增子序列

