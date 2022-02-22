/* eslint-disable camelcase */
const tap = require('tap');
const _ = require('lodash');
const p = require('../package.json');
const ActionQueue = require('../lib');

function makeDelayedFunction(message, onDone, delay = 1, isThrowing = false) {
  return async function () {
    await console.log('executing ', message);
    return new Promise((done, fail) => setTimeout(() => {
      if (isThrowing) {
        fail(isThrowing === true, 'designed fail');
        return;
      }
      if (typeof onDone === 'function') {
        onDone();
      }
      done();
    }, delay * 1000));
  };
}

tap.test(p.name, async (suite) => {
  suite.test('ActionQueue', async (testActionQueue) => {
    testActionQueue.test('basic tests', async (basicTests) => {
      basicTests.test('perform all input tests', async (doAll) => {
        let finish;
        const queue = new ActionQueue(10);

        const output = new Set();

        queue.add(makeDelayedFunction(
          'basic first',
          () => output.add('first'),
          1,
        ));
        queue.add(makeDelayedFunction(
          'basic second',
          () => output.add('second'),
          1.5,
        ));
        queue.add(makeDelayedFunction(
          'basic third',
          () => output.add('third'),
          2,
        ));

        queue.subscribe({
          next(list) {
            if (!list.find((task) => !task.isDone)) {
              doAll.ok(_.isEqual(output, new Set(['first', 'second', 'third'])));
              doAll.end();
              queue.complete();

              if (finish) {
                finish();
              }
            }
          },
        });
        return new Promise((done) => {
          finish = done;
        });
      });

      basicTests.test('perform tests that overflow maxConcurrent', async (doOverflow) => {
        let finish;
        const queue = new ActionQueue(10);

        const output = new Set();

        queue.add(makeDelayedFunction(
          'o first',
          () => output.add('first'),
          1,
        ));
        queue.add(makeDelayedFunction(
          'o second',
          () => output.add('second'),
          1.5,
        ));
        queue.add(makeDelayedFunction(
          'o third',
          () => output.add('third'),
          2,
        ));

        queue.add(makeDelayedFunction(
          'o fourth',
          () => output.add('fourth'),
          2.5,
        ));
        queue.add(makeDelayedFunction(
          'o fifth',
          () => output.add('fifth'),
          3,
        ));
        queue.add(makeDelayedFunction(
          'o sixth',
          () => output.add('sixth'),
          3.5,
        ));

        queue.subscribe({
          next(list) {
            if (!list.find((task) => !task.isDone)) {
              doOverflow.ok(_.isEqual(output, new Set(['first', 'second', 'third', 'fourth', 'fifth', 'sixth'])));
              doOverflow.end();
              queue.complete();

              if (finish) {
                finish();
              }
            }
          },
        });
        return new Promise((done) => {
          finish = done;
        });
      });
    }, { skip: true });
    testActionQueue.test('tests with failures', async (testsThatFail) => {
      testsThatFail.test('perform all input tests with failure', async (doAll) => {
        let finish;
        const queue = new ActionQueue(10);

        const output = new Set();

        queue.add(makeDelayedFunction(
          'f first',
          () => output.add('f first'),
          1,
        ), 1);
        queue.add(makeDelayedFunction(
          'f second',
          () => output.add('f second'),
          1.5,
          true,
        ), 2);
        queue.add(makeDelayedFunction(
          'f third',
          () => output.add('f third'),
          2,
        ), 3);

        queue.subscribe({
          next(list) {
            console.log('--- queue next');
            if (!list.find((task) => !task.isDone)) {
              console.log('--- FAILED IS DONE output', output);
              doAll.ok(_.isEqual(output, new Set(['f first', 'f third'])));
              doAll.end();
              queue.complete();

              if (finish) {
                finish();
              }
            } else {
              console.log('--- failed still in process', list.map((t) => t.toJSON()));
            }
          },
          error(err) {
            console.log('error in failed tests: ', err);
          },
          complete() {
            console.log('--- failed is complete');
          },
        });
        return new Promise((done) => {
          finish = done;
        });
      });

      testsThatFail.test('tests that overflow maxConcurrent', async (doOverflow) => {
        let finish;
        const queue = new ActionQueue(10);

        const output = new Set();

        queue.add(makeDelayedFunction(
          'o first',
          () => output.add('first'),
          1,
        ));
        queue.add(makeDelayedFunction(
          'o second',
          () => output.add('second'),
          1.5,
        ));
        queue.add(makeDelayedFunction(
          'o third',
          () => output.add('third'),
          2,
        ));

        queue.add(makeDelayedFunction(
          'o fourth',
          () => output.add('fourth'),
          2.5,
        ));
        queue.add(makeDelayedFunction(
          'o fifth',
          () => output.add('fifth'),
          3,
        ));
        queue.add(makeDelayedFunction(
          'o sixth',
          () => output.add('sixth'),
          3.5,
        ));

        queue.subscribe({
          next(list) {
            if (!list.find((task) => !task.isDone)) {
              doOverflow.ok(_.isEqual(output, new Set(['first', 'second', 'third', 'fourth', 'fifth', 'sixth'])));
              doOverflow.end();
              queue.complete();

              if (finish) {
                finish();
              }
            }
          },
        });
        return new Promise((done) => {
          finish = done;
        });
      }, { skip: true });
    });
  });
});
