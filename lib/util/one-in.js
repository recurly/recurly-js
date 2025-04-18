/**
 * One in _
 *
 * Has a 1 in _ chance of returning true
 *
 * @param  {number} odds set size
 * @return {Boolean}
 */
export default (odds) => Math.floor(Math.random() * odds) === 0;
