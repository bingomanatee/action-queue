/* eslint-disable camelcase */
const tap = require('tap');
const _ = require('lodash');
const p = require('../package.json');
const ActionQueue = require('../lib');

function makeDelayedFunction(message, onDone, delay = 1, isThrowing = false) {
  const name = message.replace(/[\s]+/g, '_');
  const ob = {
    [name]: async function () {
      console.log('executing ', message);
      return new Promise((done, fail) => setTimeout(() => {
        if (isThrowing) {
          fail(isThrowing === true ? message : isThrowing)
          return;
        }
        if (typeof onDone === 'function') {
          onDone();
        }
        done();
      }, delay * 1000));
    }
  }
  return ob[name];
}

function profile(queue) {
  let out = [];
  queue.tasks.subscribe((tasks) => {
    const byStatus = _(tasks).groupBy('status')
      .mapValues(list => _.map(list, '$name')).value();
    if (!_.isEqual(_.last(out), byStatus)) {
      out.push(byStatus);
    }
  });
  return out;
}

tap.test(p.name, async (suite) => {
  suite.test('ActionQueue', async (testActionQueue) => {
    await testActionQueue.test('basic tests', async (basicTests) => {
      await basicTests.test('perform all input tests', async (doAll) => {
        const queue = new ActionQueue(10);
        const tasksProfile = profile(queue);
        const output = new Set();

        await Promise.all([
          queue.add(makeDelayedFunction(
            'basic first',
            () => output.add('first'),
            1
          )),
          queue.add(makeDelayedFunction(
            'basic second',
            () => output.add('second'),
            1.5,
          )),
          queue.add(makeDelayedFunction(
            'basic third',
            () => output.add('third'),
            2,
          ))
        ]);
        doAll.ok(_.isEqual(output, new Set(['first', 'second', 'third'])));
        doAll.same(tasksProfile,
          [
            {},
            {active: ['basic_first']},
            {active: ['basic_first', 'basic_second']},
            {active: ['basic_first', 'basic_second', 'basic_third']},
            {
              done: ['basic_first'],
              active: ['basic_second', 'basic_third']
            },
            {
              done: ['basic_first', 'basic_second'],
              active: ['basic_third']
            },
            {done: ['basic_first', 'basic_second', 'basic_third']}
          ]
        )
      });
      await basicTests.test('perform tests that overflow maxConcurrent', async (doOverflow) => {
        const queue = new ActionQueue(3);
        const tasksProfile = profile(queue);
        const output = new Set();

        await Promise.all([
          queue.add(makeDelayedFunction(
            'o first',
            () => output.add('first'),
            1,
          )),
          queue.add(makeDelayedFunction(
            'o second',
            () => output.add('second'),
            1.5,
          )),
          queue.add(makeDelayedFunction(
            'o third',
            () => output.add('third'),
            2,
          )),

          queue.add(makeDelayedFunction(
            'o fourth',
            () => output.add('fourth'),
            2.5,
          )),
          queue.add(makeDelayedFunction(
            'o fifth',
            () => output.add('fifth'),
            3,
          )),
          queue.add(makeDelayedFunction(
            'o sixth',
            () => output.add('sixth'),
            3.5,
          ))

        ]);
        doOverflow.ok(_.isEqual(output, new Set(['first', 'second', 'third', 'fourth', 'fifth', 'sixth'])));
        doOverflow.same(tasksProfile,
          [
            {},
            {active: ['o_first']},
            {active: ['o_first', 'o_second']},
            {active: ['o_first', 'o_second', 'o_third']},
            {active: ['o_first', 'o_second', 'o_third'], new: ['o_fourth']},
            {
              active: ['o_first', 'o_second', 'o_third'],
              new: ['o_fourth', 'o_fifth']
            },
            {
              active: ['o_first', 'o_second', 'o_third'],
              new: ['o_fourth', 'o_fifth', 'o_sixth']
            },
            {
              done: ['o_first'],
              active: ['o_second', 'o_third', 'o_fourth'],
              new: ['o_fifth', 'o_sixth']
            },
            {
              done: ['o_first', 'o_second'],
              active: ['o_third', 'o_fourth', 'o_fifth'],
              new: ['o_sixth']
            },
            {
              done: ['o_first', 'o_second', 'o_third'],
              active: ['o_fourth', 'o_fifth', 'o_sixth']
            },
            {
              done: ['o_first', 'o_second', 'o_third', 'o_fourth'],
              active: ['o_fifth', 'o_sixth']
            },
            {
              done: ['o_first', 'o_second', 'o_third', 'o_fourth', 'o_fifth'],
              active: ['o_sixth']
            },
            {
              done: [
                'o_first',
                'o_second',
                'o_third',
                'o_fourth',
                'o_fifth',
                'o_sixth'
              ]
            }
          ]
        )
      })
    });
    await testActionQueue.test('tests with failures', async (testsThatFail) => {
      await testsThatFail.test('perform all input tests with failure', async (doWithFail) => {
        const queue = new ActionQueue(10);
        const tasksProfile = profile(queue);
        const output = new Set();
        try {
          await Promise.all([
            queue.add(makeDelayedFunction(
              'f first',
              () => output.add('f first'),
              1,
            ), 1),
            await queue.add(makeDelayedFunction(
              'f second',
              () => output.add('f second'),
              1.5,
              true,
            )).catch((err) => {
              console.log('second caught exception', err);
            }),
            queue.add(makeDelayedFunction(
              'f third',
              () => output.add('f third'),
              2,
            ), 3)
          ])
        } catch (err) {
          console.log('--- error in promise all ---- ', err);
        }
        console.log('eProfile, ', JSON.stringify(tasksProfile));
        doWithFail.same(tasksProfile,
          [
            {},
            {"active": ["f_first"]},
            {"active": ["f_first", "f_second"]},
            {
              "done": ["f_first"],
              "active": ["f_second"]
            },
            {"done": ["f_first"], "error": ["f_second"]},
            {
              "done": ["f_first"],
              "error": ["f_second"],
              "active": ["f_third"]
            },
            {"done": ["f_first", "f_third"], "error": ["f_second"]}
          ]
        );
        doWithFail.ok(_.isEqual(output, new Set(['f first', 'f third'])));
      });
      await testsThatFail.test('perform tests that overflow maxConcurrent with failure', async (doOverflow) => {
        const queue = new ActionQueue(3);
        const tasksProfile = profile(queue);

        const output = new Set();

        await Promise.all([
          queue.add(makeDelayedFunction(
            'of first',
            function first() {
              output.add('first')
            },
            1,
          )),
          queue.add(makeDelayedFunction(
            'of second',
            () => output.add('second'),
            1.5,
          )),
          queue.add(makeDelayedFunction(
            'of third',
            () => output.add('third'),
            2,
          )),

          queue.add(makeDelayedFunction(
            'of fourth',
            () => output.add('fourth'),
            2.5,
          )),
          (async () => {
            try {
              await queue.add(makeDelayedFunction(
                'of fifth',
                () => output.add('fifth'),
                3,
                true
              ));
            } catch (err) {
              console.warn('overflow error:', err);
            }
          })(),
          queue.add(makeDelayedFunction(
            'of sixth',
            () => output.add('sixth'),
            3.5,
          ))

        ]);
        doOverflow.ok(_.isEqual(output, new Set(['first', 'second', 'third', 'fourth', 'sixth'])));
        doOverflow.same(tasksProfile, [{},
          {"active": ["of_first"]},
          {"active": ["of_first", "of_second"]}, {"active": ["of_first", "of_second", "of_third"]},
          {
            "active": ["of_first", "of_second", "of_third"],
            "new": ["of_fourth"]
          }, {
            "active": ["of_first", "of_second", "of_third"],
            "new": ["of_fourth", "of_fifth"
            ]
          }, {
            "active": ["of_first", "of_second", "of_third"],
            "new": ["of_fourth", "of_fifth", "of_sixth"]
          }, {
            "done": ["of_first"],
            "active": ["of_second", "of_third", "of_fourth"],
            "new": ["of_fifth", "of_sixth"]
          }, {
            "done": ["of_first", "of_second"],
            "active": ["of_third", "of_fourth", "of_fifth"],
            "new": ["of_sixth"]
          }, {
            "done": ["of_first", "of_second", "of_third"],
            "active": ["of_fourth", "of_fifth", "of_sixth"]
          }, {
            "done": ["of_first", "of_second", "of_third", "of_fourth"],
            "active": ["of_fifth", "of_sixth"]
          }, {
            "done": ["of_first", "of_second", "of_third", "of_fourth"],
            "error": ["of_fifth"],
            "active": ["of_sixth"]
          },
          {"done": ["of_first", "of_second", "of_third", "of_fourth", "of_sixth"], "error": ["of_fifth"]}]
        );
      });
    });
  });
});
