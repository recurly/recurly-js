/**
 * Overrides `it` if we're partitioning the test suite
 *
 * to invoke, add the env variable SUITE_PARTITION. example:
 *
 * BROWSER=ChromeHeadless SUITE_PARTITION=A make test-unit
 */

const PARTITIONS = ['A', 'B', 'C', 'D', 'E', 'F']; // add letters here and .travis.yml for IE11 as necessary

function skipPartition (testIdx) {
  return SUITE_PARTITION !== PARTITIONS[testIdx % PARTITIONS.length];
}

function overrideItForPartitions () {
  const origIt = it;
  let count = 0;

  // eslint-disable-next-line no-global-assign
  it = function (...args) {
    if (typeof args[args.length - 1] === 'function' && skipPartition(count++)) {
      return origIt.skip(...args);
    }
    return origIt(...args);
  };

  it.skip = origIt.skip;
}

const { SUITE_PARTITION } = window.__env__;
if (SUITE_PARTITION) overrideItForPartitions();
