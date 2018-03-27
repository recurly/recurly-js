/**
 * Reduces an array into a object whose keys
 * correspond to the value returned by the iteratee function
 *
 * @param  {array}    set      array to group
 * @param  {Function} iteratee returns the value upon which to group
 * @return {Object}            { [iteratee[item]]: [items...], ... }
 */

export default function groupBy (set, iteratee = v => v) {
  return set.reduce((acc, item) => {
    const reductionKey = iteratee(item);
    (acc[reductionKey] = acc[reductionKey] || []).push(item);
    return acc;
  }, {});
}
