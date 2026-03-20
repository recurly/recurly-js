import assert from 'assert';
import dateFromNow from '../../../lib/util/date-from-now';

describe('dateFromNow', () => {
  describe('constants', () => {
    it('exposes MONTHS', () => {
      assert.strictEqual(dateFromNow.MONTHS, 'months');
    });

    it('exposes DAYS', () => {
      assert.strictEqual(dateFromNow.DAYS, 'days');
    });
  });

  describe('DAYS unit', () => {
    it('returns a Date', () => {
      assert(dateFromNow(1, dateFromNow.DAYS) instanceof Date);
    });

    it('adds the given number of days', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 15).getTime(), toFake: ['Date'] });
      try {
        const result = dateFromNow(5, dateFromNow.DAYS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 0);
        assert.strictEqual(result.getDate(), 20);
      } finally {
        clock.restore();
      }
    });

    it('handles adding zero days', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 15).getTime(), toFake: ['Date'] });
      try {
        const result = dateFromNow(0, dateFromNow.DAYS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 0);
        assert.strictEqual(result.getDate(), 15);
      } finally {
        clock.restore();
      }
    });

    it('handles day count that overflows into the next month', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 28).getTime(), toFake: ['Date'] }); // Jan 28
      try {
        const result = dateFromNow(10, dateFromNow.DAYS); // Feb 7
        assert.strictEqual(result.getMonth(), 1);
        assert.strictEqual(result.getDate(), 7);
      } finally {
        clock.restore();
      }
    });
  });

  describe('MONTHS unit', () => {
    it('returns a Date', () => {
      assert(dateFromNow(1, dateFromNow.MONTHS) instanceof Date);
    });

    it('adds the given number of months', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 15).getTime(), toFake: ['Date'] }); // Jan 15
      try {
        const result = dateFromNow(3, dateFromNow.MONTHS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 3); // April
        assert.strictEqual(result.getDate(), 15);
      } finally {
        clock.restore();
      }
    });

    it('handles adding zero months', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 2, 15).getTime(), toFake: ['Date'] }); // March 15
      try {
        const result = dateFromNow(0, dateFromNow.MONTHS);
        assert.strictEqual(result.getMonth(), 2);
        assert.strictEqual(result.getDate(), 15);
      } finally {
        clock.restore();
      }
    });

    it('clamps to last day of month when day overflows: Jan 31 + 1 month = Feb 28', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 31).getTime(), toFake: ['Date'] });
      try {
        const result = dateFromNow(1, dateFromNow.MONTHS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 1); // February
        assert.strictEqual(result.getDate(), 28);
      } finally {
        clock.restore();
      }
    });

    it('clamps to last day of month when day overflows: March 31 + 1 month = April 30', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 2, 31).getTime(), toFake: ['Date'] });
      try {
        const result = dateFromNow(1, dateFromNow.MONTHS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 3); // April
        assert.strictEqual(result.getDate(), 30);
      } finally {
        clock.restore();
      }
    });

    it('does not clamp when the target month has enough days: Jan 28 + 1 month = Feb 28', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2026, 0, 28).getTime(), toFake: ['Date'] });
      try {
        const result = dateFromNow(1, dateFromNow.MONTHS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 1); // February
        assert.strictEqual(result.getDate(), 28);
      } finally {
        clock.restore();
      }
    });

    it('handles year rollover: Nov 15 + 3 months = Feb 15 next year', () => {
      const clock = sinon.useFakeTimers({ now: new Date(2025, 10, 15).getTime(), toFake: ['Date'] }); // Nov 15 2025
      try {
        const result = dateFromNow(3, dateFromNow.MONTHS);
        assert.strictEqual(result.getFullYear(), 2026);
        assert.strictEqual(result.getMonth(), 1); // February
        assert.strictEqual(result.getDate(), 15);
      } finally {
        clock.restore();
      }
    });
  });

  describe('unsupported unit', () => {
    it('throws for an unknown unit string', () => {
      assert.throws(
        () => dateFromNow(1, 'weeks'),
        /Unsupported unit: weeks/
      );
    });

    it('throws when unit is undefined', () => {
      assert.throws(
        () => dateFromNow(1, undefined),
        /Unsupported unit: undefined/
      );
    });
  });
});
