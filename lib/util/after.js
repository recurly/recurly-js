/**
 * Returns a function which calls the callback after x calls
 *
 * @param  {Number} count
 * @param  {Function} done
 * @return {Function}
 */
export default function after (count = 0, done) {
  let i = 0;
  return () => i++ && i === count && done();
}
