import { BehaviorSubject, Subject } from 'rxjs';
import EventEmitter from 'events';
import { Task } from './Task';

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
    console.log('performNext');
    const list = this.tasks.value;
    const firstPending = list.find((task) => {
      if (task.isStopped) return false;
      if (task.value.status === 'new') return true;
      return false;
    });
    if (firstPending) {
      console.log('performing', firstPending.toJSON());
      this.perform(firstPending);
    } else {
      console.log('.... performNext -- nothing to do');
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
    console.log('perform: DOING ', task.toJSON());
    try {
      task.next({ ...task.value, status: 'active' });
      const result = await fn(task, ...args);
      if (this.tasks.isStopped) return;
      task.next({ ...task.value, status: 'done', result });
      if (this.tasks.isStopped) return;
      console.log('----- task COMPLETE:', task);
      if (!task.isStopped) task.complete();
    } catch (err) {
      console.log('error executing ', task.toJSON(), err.message);
      if (!task.isStopped) task.error(err);
      this.removeTask(task);
    }
  }

  removeTask(task) {
    if (this.tasks.isStopped) return;
    if (task.isStopped) return;
    const nextTasks = this.tasks.value.filter((t) => (t !== task) && !t.isStopped);
    this.tasks.next(nextTasks);
  }

  add(fn, ...args) {
    const task = new Task(this, fn, args);
    const self = this;

    task.subscribe({
      next(manifest) {
        self.tasks.next(self.tasks.value);
      },
      error(error) {
        self.removeTask(task);
      },
      complete() {
        self.removeTask(task);
      },
    });
    this.tasks.next([...this.tasks.value, task]);
  }

  subscribe(listener) {
    return this.tasks.subscribe(listener);
  }
}
