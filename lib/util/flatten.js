/**
 * Flattens an array from any dimension to 1D
 *
 * @param  {Array} arr
 * @return {Array} flattened array
 */

export default function flatten (arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}
