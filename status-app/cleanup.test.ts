const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCleanupPlan, shouldRunCleanup } = require('./cleanup.ts');

test('cleanup runs when runner fleet is idle', () => {
  const result = shouldRunCleanup({
    status: {
      targets: [{
        githubRunners: [{ busy: false }],
        activeRuns: [],
        activeJobs: [],
      }],
    },
    cleanupState: {
      running: false,
      lastRunAt: 0,
    },
    now: Date.now(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, 'runner-idle');
});

test('cleanup skips while a run is active', () => {
  const result = shouldRunCleanup({
    status: {
      targets: [{
        githubRunners: [{ busy: true }],
        activeRuns: [{ id: 1 }],
        activeJobs: [{ name: 'build', runner_name: 'busy-runner' }],
      }],
    },
    cleanupState: {
      running: false,
      lastRunAt: 0,
    },
    now: Date.now(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'run-active');
});

test('cleanup plan collects stale managed stacks with no running containers', () => {
  const plan = buildCleanupPlan({
    status: {
      targets: [{
        githubRunners: [{ name: 'busy-runner', busy: true }],
        localRunners: [{ runnerName: 'busy-runner', state: 'running' }],
        activeRuns: [],
        activeJobs: [],
      }],
    },
    dockerContainers: [
      {
        Id: 'managed-runner',
        Created: Math.floor((Date.now() - (45 * 60 * 1000)) / 1000),
        State: 'exited',
        Labels: {
          'io.github-runner-fleet.managed': 'true',
          'io.github-runner-fleet.stack-id': 'stack-old',
          'io.github-runner-fleet.runner-name': 'old-runner',
          'io.github-runner-fleet.target-id': 'gymnerd-org',
        },
      },
      {
        Id: 'managed-dind',
        Created: Math.floor((Date.now() - (45 * 60 * 1000)) / 1000),
        State: 'exited',
        Labels: {
          'io.github-runner-fleet.managed': 'true',
          'io.github-runner-fleet.stack-id': 'stack-old',
          'io.github-runner-fleet.runner-name': 'old-runner',
          'io.github-runner-fleet.target-id': 'gymnerd-org',
        },
      },
      {
        Id: 'managed-busy',
        Created: Math.floor((Date.now() - (45 * 60 * 1000)) / 1000),
        State: 'running',
        Labels: {
          'io.github-runner-fleet.managed': 'true',
          'io.github-runner-fleet.stack-id': 'stack-busy',
          'io.github-runner-fleet.runner-name': 'busy-runner',
          'io.github-runner-fleet.target-id': 'gymnerd-org',
        },
      },
    ],
    dockerVolumes: [
      {
        Name: 'volume-old',
        CreatedAt: new Date(Date.now() - (45 * 60 * 1000)).toISOString(),
        Labels: {
          'io.github-runner-fleet.managed': 'true',
          'io.github-runner-fleet.stack-id': 'stack-old',
          'io.github-runner-fleet.runner-name': 'old-runner',
          'io.github-runner-fleet.target-id': 'gymnerd-org',
        },
      },
    ],
    dockerNetworks: [
      {
        Name: 'network-old',
        Created: new Date(Date.now() - (45 * 60 * 1000)).toISOString(),
        Labels: {
          'io.github-runner-fleet.managed': 'true',
          'io.github-runner-fleet.stack-id': 'stack-old',
          'io.github-runner-fleet.runner-name': 'old-runner',
          'io.github-runner-fleet.target-id': 'gymnerd-org',
        },
      },
    ],
  });

  assert.equal(plan.staleManagedStacks.length, 1);
  assert.deepEqual(plan.staleManagedStacks[0].containerIds, ['managed-runner', 'managed-dind']);
  assert.deepEqual(plan.staleManagedStacks[0].volumeNames, ['volume-old']);
  assert.deepEqual(plan.staleManagedStacks[0].networkNames, ['network-old']);
  assert.equal(plan.staleManagedStacks[0].runnerName, 'old-runner');
});
