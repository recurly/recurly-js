/**
 * Returns a future Date that is `interval` units from now.
 *
 * @param  {Number} interval  number of units to add
 * @param  {String} unit      dateFromNow.MONTHS or dateFromNow.DAYS
 * @return {Date}
 */
export default function dateFromNow (interval, unit) {
  const now = new Date();

  if (unit === dateFromNow.DAYS) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + interval);
  }

  if (unit === dateFromNow.MONTHS) {
    const day = now.getDate();
    const result = new Date(now.getFullYear(), now.getMonth() + interval, day);

    // If adding months caused day overflow (e.g. March 31 + 1 month = May 1),
    // back up to the last day of the intended target month.
    if (result.getDate() !== day) {
      result.setDate(0); // day 0 = last day of previous month
    }

    return result;
  }

  throw new Error(`Unsupported unit: ${unit}`);
}

dateFromNow.MONTHS = 'months';
dateFromNow.DAYS = 'days';
