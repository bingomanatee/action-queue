/**
 *
 * Task is a simple record of a pending action.
 * it has three properties:
 * fn {Fundction} the pending action
 * args {[any]} any subsequent values passed through to perform
 * stop {boolean} a value indicating the calling context wants to
 */
import { BehaviorSubject, Subject } from 'rxjs';

let _id = 0;

export class Task extends BehaviorSubject {
  constructor(queue, fn, args = []) {
    if (typeof fn !== 'function') {
      throw new Error('task must be fed function');
    }
    super({
      fn, args, status: 'new', queue,
    });
    this.$id = ++_id;

    this.$name = fn.name ? fn.name: this.$id;
  }

  get isDone() {
    if (this.isStopped) return true;
    return this.status === 'done';
  }

  get status() {
    if (this._value.error) {
      return 'error';
    }
    if (this.isStopped) {
      return 'done';
    }
    return this.value.status;
  }

  toJSON() {
    if (this.isStopped) return 'stopped';

    const v = { ...this.value };

    delete v.queue;
    return v;
  }
}
