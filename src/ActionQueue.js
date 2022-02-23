import {BehaviorSubject, Subject} from 'rxjs';
import EventEmitter from 'events';
import {Task} from './Task';

const once = require('lodash/once');

export default class ActionQueue extends EventEmitter {
  constructor(maxConcurrent) {
    if ((maxConcurrent < 1) || (!(typeof maxConcurrent === 'number'))) {
      throw new Error('ActionQueue requires a positive number for concurrency');
    }
    super();
    this.tasks = new BehaviorSubject([]);
    this.finished = new Subject();
    this.failed = new Subject();
    this.maxConcurrent = maxConcurrent;
    const target = this;

    this.tasks.subscribe({
      next(list) {
        const active = list.filter((task) => task.value.status === 'active');
        if (active.length < target.maxConcurrent) {
          target.performNext();
        }
      },
      error(err) {
        console.warn('tasks error: ', err);
      },
      complete() {
        const tasks = target.tasks._value;
        if (tasks && Array.isArray(tasks)) {
          tasks.forEach((task) => {
            if (!task.isStopped) {
              task.complete();
            }
          });
        }
      },
    });
  }

  performNext() {
    const list = this.tasks.value;
    const firstPending = list.find((task) => {
      if (task.isStopped) {
        return false;
      }
      if (task.value.status === 'new') {
        return true;
      }
      return false;
    });
    if (firstPending) {
      this.perform(firstPending);
    }
  }

  complete() {
    return this.tasks.complete();
  }

  async perform(task) {
    if (!task) {
      return;
    }
    if (task.isStopped) {
      console.warn('attempt to perform stopped task', task);
      return;
    }
    const {
      fn, args, status, queue,
    } = task.value;
    if (queue !== this) {
      console.warn('attempt to process foreign task', task);
    }
    if (status !== 'new') {
      console.warn('attempt to perform a non-new task', task);
      return;
    }

    try {
      task.next({...task.value, status: 'active'});
      const result = await fn(task, ...args);
      if (this.tasks.isStopped) {
        return;
      }
      task.next({...task.value, status: 'done', result});

      if (!task.isStopped) {
        task.complete();
      }
    } catch (err) {
      console.log('error executing ', task.toJSON(), err);
      if (!task.isStopped) {
        task.next({...task.value, status: 'error', error: err});
        task.complete();
      }
      this.removeTask(task);
    }
  }

  removeTask(task) {
    if (this.tasks.isStopped) {
      return;
    }
    if (task.isStopped) {
      return;
    }
    const nextTasks = this.tasks.value.filter((t) => (t !== task) && !t.isStopped);
    this.tasks.next(nextTasks);
  }

  task(fn, ...args) {
    const task = new Task(this, fn, args);
    this.tasks.next([...this.tasks.value, task]);
    const self = this;
    task.subscribe({
      next(manifest) {
        self.tasks.next(self.tasks.value);
      },
      error(err) {

      }
    });
    return task;
  }

  add(fn, ...args) {
    const task = this.task(fn, ...args);
    const self = this;
    return new Promise((done, fail) => {
      let sub;
      let finish = once(() => {
        done();
        sub.unsubscribe();
      });

      sub = task.subscribe({
        next(manifest) {
          if (manifest.status === 'done') {
            finish();
          }
          if (manifest.status === 'error') {
            fail(manifest.error);
            sub.unsubscribe();
          }
        },
        error(error) {
          self.removeTask(task);
          fail(error);
        },
        complete() {
          self.removeTask(task);
          finish();
        },
      });
    });
  }

  subscribe(listener) {
    return this.tasks.subscribe(listener);
  }
}
