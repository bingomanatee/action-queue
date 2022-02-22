import { BehaviorSubject, filter, Subject } from 'rxjs';
import EventEmitter from 'events';
import { Task } from '../src/Task';

function addToSet(set, value) {
  const newSet = new Set(set.values());
  newSet.add(value);
  return newSet;
}

function removeFromSet(aSet, value) {
  const newSet = new Set(aSet);
  newSet.delete(value);
  return newSet;
}

/**
 * Action queue is a registry of tasks that are potentially
 * long-running and resource intensive.
 *
 * A throttle is placed on the number of tasks that can be executed.
 *
 * All tasks begin in the delayed queue; if. after added, the propcessiong
 * queue is under limit, the first added task is added to the active queue.
 *
 *
 *
 * When a job is finished
 */
export default class ActionQueueOld extends EventEmitter {
  /**
   *
   * @param maxConcurrent {number} a positive number (1 or higher)
   */
  constructor(maxConcurrent = 10) {
    if ((maxConcurrent < 1) || (!(typeof maxConcurrent === 'number'))) {
      throw new Error('ActionQueue requires a positive number for concurrency');
    }
    super();
    this.delayed = new BehaviorSubject(new Set());
    this.active = new BehaviorSubject(new Set());
    this.finished = new Subject();
    this.failed = new Subject();
    this.maxConcurrent = maxConcurrent;
    const target = this;

    this.active.subscribe({
      next(processingSet) {
        target.emit('active', processingSet.size);

        if (typeof process !== 'undefined') {
          process.nextTick(() => target.tryNextTask());
        } else {
          target.tryNextTask();
        }
      },
      error(err) {
        target.emit('active error', err);
      },
    });

    this.delayed.subscribe({
      next(delayedSet) {
        const task = Array.from(delayedSet.values()).pop();
        if (task && target.activeTaskCount < target.maxConcurrent) {
          target.addTaskToActive(task);
        }
        target.emit('delayed', delayedSet.size);
      },
      error(err) {
        console.log('error in delayed: ', err);
        target.emit('delayed error ', err);
      },
    });

    this.finished.subscribe({
      next(task) {
        target.emit('finished', task);
      },
      error(err) {
        target.emit('finished error', err);
      },
    });

    this.failed.subscribe({
      next(task) {
        target.emit('failed', task);
      },
      error(err) {
        target.emit('finished error', err);
      },
    });
  }

  /**
   * the number of active tasks actively executing
   * @returns {number}
   */
  get activeTaskCount() {
    return this.active.getValue().size;
  }

  /**
   *
   * @param task {Task} a function-argument tuplet
   */
  addToDelayed(task) {
    if (!this.delayed.getValue().has(task)) {
      this.delayed.next(addToSet(this.delayed.getValue(), task));
    }
  }

  async perform(task) {
    this.removeTaskFromDelayed(task);
    try {
      await task.$perform();
      this.finished.next(task);
    } catch (err) {
      this.emit('task error', { task, err });
      this.failed.next(task);
    }
    this.removeTaskFromActive(task);
  }

  async addTaskToActive(task) {
    if (!this.active.getValue().has(task)) {
      const newSet = addToSet(this.active.getValue(), task);

      this.active.next(newSet);
      await this.perform(task);
    }
  }

  removeTaskFromActive(task) {
    this.active.next(removeFromSet(this.active.getValue(), task));
  }

  tryNextTask() {
    if (this.activeTaskCount < this.maxConcurrent) {
      const next = this.removeTaskFromDelayed();
      if (next) {
        this.addTaskToActive(next);
      }
    }
  }

  /**
   * next eligable task in delayed set
   * @returns {Task}
   */
  nextTask() {
    const tasks = Array.from(this.delayed.getValue());
    return tasks.shift();
  }

  /**
   * publishes a new set to delayed without the passed parameter
   * @param task {Task}
   * @returns {Task|undefined}
   */
  removeTaskFromDelayed(task) {
    if (!task) {
      task = this.nextTask();
    }
    if (!task) return null;

    this.delayed.next(removeFromSet(this.delayed.getValue(), task));

    return task;
  }

  _doTask(task) {
    this._lastTask = task;
    return new Promise((done, fail) => {
      this.finished.pipe(filter((finishedTask) => finishedTask === task)).subscribe({
        next(emittedFinishedTask) {
          done(emittedFinishedTask);
        },
        error(err) {
          fail({ task, err });
        },
      });
      this.addToDelayed(task);
    });
  }

  /**
   * This is the public method that adds a task to the queue.
   * @param fn
   * @param args optional arguments passed to function
   * @returns {Promise<unknown>} a promise when this specific task is done
   */
  perform(fn, ...args) {
    if (typeof fn !== 'function') {
      throw new Error('ActionQueue::perform fed non-function');
    }
    const task = new Task(fn, args);
    return this._doTask(task);
  }

  /**
   * An alternate public method that adds a task to the queue
   * and returns the Task instead of a promise.
   * @param fn
   * @param args
   * @returns {Task}
   */
  task(fn, ...args) {
    if (typeof fn !== 'function') {
      throw new Error('ActionQueue::task fed non-function');
    }
    const task = new Task(fn, args);
    this._doTask(task);
    return task;
  }

  /**
   * attempt to prevent a task from execution, and remove it from the queue.
   * a task will only be guaranteed to be interrupted if it is delayed.
   * Otherwise, the flagStop field of the task will be set to true, and it is
   * the function's responsibility to monitor that value.
   * @param task {Task}
   * @returns {string|boolean|null}
   */
  suspend(task) {
    if (task.isStopped) return null;
    task.$finish();
    if (this.delayed.getValue().has(task)) {
      this.delayed.next(removeFromSet(this.delayed.getValue(), task));
      return true;
    }
    if (this.active.getValue().has(task)) {
      return 'processing';
    }

    return false;
  }
}
