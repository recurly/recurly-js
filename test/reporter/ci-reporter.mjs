import { relative } from 'path';
import { bold, cyan } from 'nanocolors';
import { formatError } from '@web/test-runner';

// Strip ANSI color codes and collapse to a single line for GHA annotations.
// ::error:: values can't contain newlines, so we collapse them to ' | '.
const ANSI_RE = /\x1B\[[0-9;]*m/g;
function stripAnsi (s) { return String(s).replace(ANSI_RE, ''); }
function oneLine (s) { return stripAnsi(s).replace(/\n/g, ' | ').replace(/\s+/g, ' ').trim().slice(0, 300); }

// Recursively yield all tests with their full suite breadcrumb as `fullName`.
function * walkTests (suite, path = []) {
  const crumbs = suite.name ? [...path, suite.name] : path;
  for (const t of suite.tests ?? []) {
    yield { ...t, fullName: [...crumbs, t.name].join(' > ') };
  }
  for (const child of suite.suites ?? []) {
    yield * walkTests(child, crumbs);
  }
}

export function ciReporter () {
  const isGHA = process.env.GITHUB_ACTIONS === 'true';
  let favoriteBrowser = '';
  let allBrowserNames = [];

  return {
    start (args) {
      allBrowserNames = args.browserNames;
      // Prefer Chrome/Firefox for displaying diffs when multiple browsers run.
      favoriteBrowser = allBrowserNames.find(n => /chrome|chromium|firefox/i.test(n))
        ?? allBrowserNames[0]
        ?? '';
    },

    reportTestFileResults ({ sessionsForTestFile, testFile }) {
      const failedSessions = sessionsForTestFile.filter(s => !s.passed);
      if (failedSessions.length === 0) return;

      const relFile = relative(process.cwd(), testFile);

      // Print file header directly — avoids WTR's deferred BufferedLogger flush
      // so that error output always precedes the final summary.
      process.stdout.write(`\n${bold(cyan(relFile))}:\n\n`);

      for (const session of failedSessions) {
        const bName = session.browser.name;

        // Session-level errors (e.g. the test file itself failed to load).
        for (const err of session.errors ?? []) {
          process.stdout.write(` ❌ ${formatError(err)}\n\n`);
          if (isGHA) {
            process.stdout.write(`::error file=${relFile}::${oneLine(err.message ?? String(err))}\n`);
          }
        }

        if (!session.testResults) continue;

        for (const test of walkTests(session.testResults)) {
          if (test.skipped || test.passed) continue;

          // When multiple browsers run, show the browser name for non-favorite failures.
          const bLabel = allBrowserNames.length > 1 && bName !== favoriteBrowser
            ? ` [${bName}]`
            : '';

          process.stdout.write(` ❌ ${test.fullName}${bLabel}\n\n`);
          if (test.error) {
            process.stdout.write(formatError(test.error).split('\n').map(l => `   ${l}`).join('\n'));
            process.stdout.write('\n\n');
          }

          if (isGHA && test.error) {
            process.stdout.write(`::error file=${relFile}::${oneLine(`${test.fullName}: ${test.error.message}`)}\n`);
          }
        }
      }
    },

    getTestProgress () {
      // Suppress intermediate progress lines — they print every 10 seconds in
      // non-TTY (CI) mode and add dozens of noisy lines to the log.
      return [];
    },

    onTestRunFinished ({ sessions }) {
      // Deduplicate test counts across browsers: each logical test is counted once
      // regardless of how many browsers it ran in.
      let passed = 0, failed = 0, skipped = 0;
      const seen = new Set();
      const failedFiles = new Set();
      const allFiles = new Set();

      for (const session of sessions) {
        allFiles.add(session.testFile);
        if (!session.passed) failedFiles.add(session.testFile);

        for (const test of session.testResults ? walkTests(session.testResults) : []) {
          const key = `${session.testFile}::${test.fullName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (test.skipped) skipped++;
          else if (test.passed) passed++;
          else failed++;
        }
      }

      const parts = [`${passed} passed`];
      if (failed) parts.push(`${failed} failed`);
      if (skipped) parts.push(`${skipped} skipped`);

      const fileCount = allFiles.size;
      const line = failedFiles.size > 0
        ? `✗ ${failedFiles.size}/${fileCount} test files failed | ${parts.join(', ')}`
        : `✓ ${fileCount}/${fileCount} test files passed | ${parts.join(', ')}`;

      process.stdout.write(`\n${line}\n\n`);
    },
  };
}
