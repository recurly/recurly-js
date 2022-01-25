/**
 * Overrides `it` if we're partitioning the test suite
 *
 * to invoke, add the env variable SUITE_PARTITION. example:
 *
 * BROWSER=ChromeHeadless SUITE_PARTITION=A make test-unit
 */

function overrideItForPartitions () {
  const origIt = it;
  const partition = mod => SUITE_PARTITION === 'A' ? mod : !mod;
  let count = 0;

  it = function (...args) {
    if (typeof args[args.length-1] === 'function' && partition(count++ % 2)) {
      return origIt.skip(...args);
    }
    return origIt(...args);
  };

  it.skip = origIt.skip;
}

const { SUITE_PARTITION } = window.__env__;
if (SUITE_PARTITION) overrideItForPartitions();
