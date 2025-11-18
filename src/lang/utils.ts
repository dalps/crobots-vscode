export const TODO = new Error("TODO");

export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  let result: [A, B][] = [];

  const swap = as.length < bs.length;
  let [xs, ys] = swap ? [as, bs] : [bs, as];

  xs.forEach((x, idx) => {
    let y = ys.at(idx)!;
    result.push((swap ? [x, y] : [y, x]) as [A, B]);
  });

  return result;
}

/**
 * `Array.prototype.splice` but functional
 */
export function fsplice<T>(
  arr: T[],
  start: number,
  deleteCount: number,
  ...items: T[]
) {
  const newArr = arr.slice();
  newArr.splice(start, deleteCount, ...items);
  return newArr;
}
