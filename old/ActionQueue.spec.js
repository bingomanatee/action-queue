/* eslint-disable camelcase */
const tap = require('tap');
const p = require('../package.json');

const ActionQueue = require('../lib');

function makeDelayedFunction(message, onDone, delay = 1, isThrowing = false) {
  return async function () {
    await console.log('executing ', message);
    return new Promise((done) => setTimeout(() => {
      if (typeof onDone === 'function') {
        onDone();
      }
      if (isThrowing) {
        throw isThrowing;
      }
      done();
    }, delay * 1000));
  };
}

function hasFn(queue, fn) {
  const set = queue.getValue();
  const list = Array.from(set.values());
  return list.some((task) => task.$fn === fn);
}

// note - conversion of tests to tap NOT COMPLETE.

tap.test(p.name, async (suite) => {
  suite.test('ActionQueue', async (testActionQueue) => {
    testActionQueue.test('basic tests', async (basicTests) => {
      basicTests.test('eventually does a delayed action', async (delayedAction) => {
        delayedAction.plan(5);

        const queue = new ActionQueue(10);
        const processingHistory = [];
        const delayedHistory = [];

        queue.active.subscribe((set) => {
          console.log('--- e test - proc size = ', set.size);
          processingHistory.push(set);
        });
        queue.delayed.subscribe((set) => {
          console.log('--- e test - delayed size = ', set.size);
          delayedHistory.push(set);
        });

        let functionDone = false;

        await queue.perform(makeDelayedFunction('a task', () => {
          console.log('task done');
          functionDone = true;
        }));

        delayedAction.same(delayedHistory.map((s) => s.size), [0, 0, 1]);
        delayedAction.same(processingHistory.map((s) => s.size), [0, 1, 0]);
        delayedAction.same(queue.processingSize, 0);
        delayedAction.same(queue.delayedSize, 0);
        delayedAction.ok(functionDone);
      });

      basicTests.test('delays some actions while others complete', async (delaysSome) => {
        let lastDone = null;
        try {
          let completed = 0;
          const queue = new ActionQueue(3);

          const incCompleted = () => {
            ++completed;
          };
          const third = makeDelayedFunction('third', incCompleted, 1);
          const last = makeDelayedFunction('last', incCompleted, 1.5);
          const queueList = [
            makeDelayedFunction('first', incCompleted, 1.75),
            makeDelayedFunction('second', incCompleted, 1.75),
            third,
            last,
          ];

          function whenOff(value) {
            console.log('whenOff value = ', value);
            try {
              if (value === 0) {
                delaysSome.same(completed, 4); // changed from 6; investigate
                queue.off('active', whenOff);
                delaysSome.end();
                lastDone();
              }
            } catch (err) {
              console.log('eeeeeeeerror:', err);
            }
          }

          function onProcessing(value) {
            if (value > 0) {
              queue.off('active', onProcessing);
              queue.on('active', whenOff);
            }
          }

          queue.on('active', onProcessing);
          queueList.forEach((fn) => queue.perform(fn));
          // because the active is async, this is the state after all delayed items have been queued up.
          delaysSome.ok(hasFn(queue.active, third));
          delaysSome.notOk(hasFn(queue.active, last));
        } catch (err) {
          console.log('---error: ', err.message);
        }

        return new Promise((done) => {
          lastDone = done;
        });
      });

      basicTests.end();
    });

    testActionQueue.test('failing tasks', async (failing) => {
      failing.test('failure in the middle of working tasks', async (fim) => {
        let whenDone = null;
        const queue = new ActionQueue(3);

        queue.perform(makeDelayedFunction('first fim', null, 1));
        queue.perform(makeDelayedFunction('second fim', null, 1.2));
        queue.perform(makeDelayedFunction('third fim', null, 1.4));
        queue.perform(makeDelayedFunction('fourth fim', null, 1.6));
        queue.perform(makeDelayedFunction('failed fim', null, 1.8, true));
        queue.perform(makeDelayedFunction('fifth fim', null, 2));
        queue.perform(makeDelayedFunction('sixth fim', null, 2.2));
        queue.perform(makeDelayedFunction('seventh fim', null, 2.4));
        queue.perform(makeDelayedFunction('eighth fim', null, 2.6));

        let failed = 0;
        let finished = 0;

        queue.on('finished', () => ++finished);
        queue.on('failed', () => ++failed);

        function whenOff(value) {
          console.log('fim whenOff value = ', value, 'finished = ', finished, 'failed = ', failed);

          if (value === 0) {
            fim.same(finished, 8); // count all the other successful tasks
            fim.same(failed, 1); // count the failed task in the middle
            queue.off('active', whenOff);
            fim.end();
            whenDone();
          }
        }

        function onProcessing(value) {
          if (value > 0) {
            queue.off('active', onProcessing);
            queue.on('active', whenOff);
          }
        }

        queue.on('active', onProcessing);

        return new Promise((done) => {
          whenDone = done;
        })
      });
    });
  });
});
