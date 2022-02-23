(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global["@wonderlandlabs/action_queue"] = factory());
})(this, (function () { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function createErrorClass(createImpl) {
        var _super = function (instance) {
            Error.call(instance);
            instance.stack = new Error().stack;
        };
        var ctorFunc = createImpl(_super);
        ctorFunc.prototype = Object.create(Error.prototype);
        ctorFunc.prototype.constructor = ctorFunc;
        return ctorFunc;
    }

    var UnsubscriptionError = createErrorClass(function (_super) {
        return function UnsubscriptionErrorImpl(errors) {
            _super(this);
            this.message = errors
                ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
                : '';
            this.name = 'UnsubscriptionError';
            this.errors = errors;
        };
    });

    function arrRemove(arr, item) {
        if (arr) {
            var index = arr.indexOf(item);
            0 <= index && arr.splice(index, 1);
        }
    }

    var Subscription = (function () {
        function Subscription(initialTeardown) {
            this.initialTeardown = initialTeardown;
            this.closed = false;
            this._parentage = null;
            this._teardowns = null;
        }
        Subscription.prototype.unsubscribe = function () {
            var e_1, _a, e_2, _b;
            var errors;
            if (!this.closed) {
                this.closed = true;
                var _parentage = this._parentage;
                if (_parentage) {
                    this._parentage = null;
                    if (Array.isArray(_parentage)) {
                        try {
                            for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                                var parent_1 = _parentage_1_1.value;
                                parent_1.remove(this);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    else {
                        _parentage.remove(this);
                    }
                }
                var initialTeardown = this.initialTeardown;
                if (isFunction(initialTeardown)) {
                    try {
                        initialTeardown();
                    }
                    catch (e) {
                        errors = e instanceof UnsubscriptionError ? e.errors : [e];
                    }
                }
                var _teardowns = this._teardowns;
                if (_teardowns) {
                    this._teardowns = null;
                    try {
                        for (var _teardowns_1 = __values(_teardowns), _teardowns_1_1 = _teardowns_1.next(); !_teardowns_1_1.done; _teardowns_1_1 = _teardowns_1.next()) {
                            var teardown_1 = _teardowns_1_1.value;
                            try {
                                execTeardown(teardown_1);
                            }
                            catch (err) {
                                errors = errors !== null && errors !== void 0 ? errors : [];
                                if (err instanceof UnsubscriptionError) {
                                    errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                                }
                                else {
                                    errors.push(err);
                                }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_teardowns_1_1 && !_teardowns_1_1.done && (_b = _teardowns_1.return)) _b.call(_teardowns_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
                if (errors) {
                    throw new UnsubscriptionError(errors);
                }
            }
        };
        Subscription.prototype.add = function (teardown) {
            var _a;
            if (teardown && teardown !== this) {
                if (this.closed) {
                    execTeardown(teardown);
                }
                else {
                    if (teardown instanceof Subscription) {
                        if (teardown.closed || teardown._hasParent(this)) {
                            return;
                        }
                        teardown._addParent(this);
                    }
                    (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
                }
            }
        };
        Subscription.prototype._hasParent = function (parent) {
            var _parentage = this._parentage;
            return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
        };
        Subscription.prototype._addParent = function (parent) {
            var _parentage = this._parentage;
            this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
        };
        Subscription.prototype._removeParent = function (parent) {
            var _parentage = this._parentage;
            if (_parentage === parent) {
                this._parentage = null;
            }
            else if (Array.isArray(_parentage)) {
                arrRemove(_parentage, parent);
            }
        };
        Subscription.prototype.remove = function (teardown) {
            var _teardowns = this._teardowns;
            _teardowns && arrRemove(_teardowns, teardown);
            if (teardown instanceof Subscription) {
                teardown._removeParent(this);
            }
        };
        Subscription.EMPTY = (function () {
            var empty = new Subscription();
            empty.closed = true;
            return empty;
        })();
        return Subscription;
    }());
    var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
    function isSubscription(value) {
        return (value instanceof Subscription ||
            (value && 'closed' in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe)));
    }
    function execTeardown(teardown) {
        if (isFunction(teardown)) {
            teardown();
        }
        else {
            teardown.unsubscribe();
        }
    }

    var config = {
        onUnhandledError: null,
        onStoppedNotification: null,
        Promise: undefined,
        useDeprecatedSynchronousErrorHandling: false,
        useDeprecatedNextContext: false,
    };

    var timeoutProvider = {
        setTimeout: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var delegate = timeoutProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) || setTimeout).apply(void 0, __spreadArray([], __read(args)));
        },
        clearTimeout: function (handle) {
            var delegate = timeoutProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
        },
        delegate: undefined,
    };

    function reportUnhandledError(err) {
        timeoutProvider.setTimeout(function () {
            {
                throw err;
            }
        });
    }

    function noop() { }

    var context = null;
    function errorContext(cb) {
        if (config.useDeprecatedSynchronousErrorHandling) {
            var isRoot = !context;
            if (isRoot) {
                context = { errorThrown: false, error: null };
            }
            cb();
            if (isRoot) {
                var _a = context, errorThrown = _a.errorThrown, error = _a.error;
                context = null;
                if (errorThrown) {
                    throw error;
                }
            }
        }
        else {
            cb();
        }
    }

    var Subscriber = (function (_super) {
        __extends(Subscriber, _super);
        function Subscriber(destination) {
            var _this = _super.call(this) || this;
            _this.isStopped = false;
            if (destination) {
                _this.destination = destination;
                if (isSubscription(destination)) {
                    destination.add(_this);
                }
            }
            else {
                _this.destination = EMPTY_OBSERVER;
            }
            return _this;
        }
        Subscriber.create = function (next, error, complete) {
            return new SafeSubscriber(next, error, complete);
        };
        Subscriber.prototype.next = function (value) {
            if (this.isStopped) ;
            else {
                this._next(value);
            }
        };
        Subscriber.prototype.error = function (err) {
            if (this.isStopped) ;
            else {
                this.isStopped = true;
                this._error(err);
            }
        };
        Subscriber.prototype.complete = function () {
            if (this.isStopped) ;
            else {
                this.isStopped = true;
                this._complete();
            }
        };
        Subscriber.prototype.unsubscribe = function () {
            if (!this.closed) {
                this.isStopped = true;
                _super.prototype.unsubscribe.call(this);
                this.destination = null;
            }
        };
        Subscriber.prototype._next = function (value) {
            this.destination.next(value);
        };
        Subscriber.prototype._error = function (err) {
            try {
                this.destination.error(err);
            }
            finally {
                this.unsubscribe();
            }
        };
        Subscriber.prototype._complete = function () {
            try {
                this.destination.complete();
            }
            finally {
                this.unsubscribe();
            }
        };
        return Subscriber;
    }(Subscription));
    var _bind = Function.prototype.bind;
    function bind(fn, thisArg) {
        return _bind.call(fn, thisArg);
    }
    var ConsumerObserver = (function () {
        function ConsumerObserver(partialObserver) {
            this.partialObserver = partialObserver;
        }
        ConsumerObserver.prototype.next = function (value) {
            var partialObserver = this.partialObserver;
            if (partialObserver.next) {
                try {
                    partialObserver.next(value);
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
        };
        ConsumerObserver.prototype.error = function (err) {
            var partialObserver = this.partialObserver;
            if (partialObserver.error) {
                try {
                    partialObserver.error(err);
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
            else {
                handleUnhandledError(err);
            }
        };
        ConsumerObserver.prototype.complete = function () {
            var partialObserver = this.partialObserver;
            if (partialObserver.complete) {
                try {
                    partialObserver.complete();
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
        };
        return ConsumerObserver;
    }());
    var SafeSubscriber = (function (_super) {
        __extends(SafeSubscriber, _super);
        function SafeSubscriber(observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            var partialObserver;
            if (isFunction(observerOrNext) || !observerOrNext) {
                partialObserver = {
                    next: observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined,
                    error: error !== null && error !== void 0 ? error : undefined,
                    complete: complete !== null && complete !== void 0 ? complete : undefined,
                };
            }
            else {
                var context_1;
                if (_this && config.useDeprecatedNextContext) {
                    context_1 = Object.create(observerOrNext);
                    context_1.unsubscribe = function () { return _this.unsubscribe(); };
                    partialObserver = {
                        next: observerOrNext.next && bind(observerOrNext.next, context_1),
                        error: observerOrNext.error && bind(observerOrNext.error, context_1),
                        complete: observerOrNext.complete && bind(observerOrNext.complete, context_1),
                    };
                }
                else {
                    partialObserver = observerOrNext;
                }
            }
            _this.destination = new ConsumerObserver(partialObserver);
            return _this;
        }
        return SafeSubscriber;
    }(Subscriber));
    function handleUnhandledError(error) {
        {
            reportUnhandledError(error);
        }
    }
    function defaultErrorHandler(err) {
        throw err;
    }
    var EMPTY_OBSERVER = {
        closed: true,
        next: noop,
        error: defaultErrorHandler,
        complete: noop,
    };

    var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();

    function identity(x) {
        return x;
    }

    function pipeFromArray(fns) {
        if (fns.length === 0) {
            return identity;
        }
        if (fns.length === 1) {
            return fns[0];
        }
        return function piped(input) {
            return fns.reduce(function (prev, fn) { return fn(prev); }, input);
        };
    }

    var Observable = (function () {
        function Observable(subscribe) {
            if (subscribe) {
                this._subscribe = subscribe;
            }
        }
        Observable.prototype.lift = function (operator) {
            var observable = new Observable();
            observable.source = this;
            observable.operator = operator;
            return observable;
        };
        Observable.prototype.subscribe = function (observerOrNext, error, complete) {
            var _this = this;
            var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
            errorContext(function () {
                var _a = _this, operator = _a.operator, source = _a.source;
                subscriber.add(operator
                    ?
                        operator.call(subscriber, source)
                    : source
                        ?
                            _this._subscribe(subscriber)
                        :
                            _this._trySubscribe(subscriber));
            });
            return subscriber;
        };
        Observable.prototype._trySubscribe = function (sink) {
            try {
                return this._subscribe(sink);
            }
            catch (err) {
                sink.error(err);
            }
        };
        Observable.prototype.forEach = function (next, promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var subscriber = new SafeSubscriber({
                    next: function (value) {
                        try {
                            next(value);
                        }
                        catch (err) {
                            reject(err);
                            subscriber.unsubscribe();
                        }
                    },
                    error: reject,
                    complete: resolve,
                });
                _this.subscribe(subscriber);
            });
        };
        Observable.prototype._subscribe = function (subscriber) {
            var _a;
            return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
        };
        Observable.prototype[observable] = function () {
            return this;
        };
        Observable.prototype.pipe = function () {
            var operations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operations[_i] = arguments[_i];
            }
            return pipeFromArray(operations)(this);
        };
        Observable.prototype.toPromise = function (promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var value;
                _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
            });
        };
        Observable.create = function (subscribe) {
            return new Observable(subscribe);
        };
        return Observable;
    }());
    function getPromiseCtor(promiseCtor) {
        var _a;
        return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
    }
    function isObserver(value) {
        return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
    }
    function isSubscriber(value) {
        return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
    }

    var ObjectUnsubscribedError = createErrorClass(function (_super) {
        return function ObjectUnsubscribedErrorImpl() {
            _super(this);
            this.name = 'ObjectUnsubscribedError';
            this.message = 'object unsubscribed';
        };
    });

    var Subject = (function (_super) {
        __extends(Subject, _super);
        function Subject() {
            var _this = _super.call(this) || this;
            _this.closed = false;
            _this.observers = [];
            _this.isStopped = false;
            _this.hasError = false;
            _this.thrownError = null;
            return _this;
        }
        Subject.prototype.lift = function (operator) {
            var subject = new AnonymousSubject(this, this);
            subject.operator = operator;
            return subject;
        };
        Subject.prototype._throwIfClosed = function () {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
        };
        Subject.prototype.next = function (value) {
            var _this = this;
            errorContext(function () {
                var e_1, _a;
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    var copy = _this.observers.slice();
                    try {
                        for (var copy_1 = __values(copy), copy_1_1 = copy_1.next(); !copy_1_1.done; copy_1_1 = copy_1.next()) {
                            var observer = copy_1_1.value;
                            observer.next(value);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (copy_1_1 && !copy_1_1.done && (_a = copy_1.return)) _a.call(copy_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
        };
        Subject.prototype.error = function (err) {
            var _this = this;
            errorContext(function () {
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    _this.hasError = _this.isStopped = true;
                    _this.thrownError = err;
                    var observers = _this.observers;
                    while (observers.length) {
                        observers.shift().error(err);
                    }
                }
            });
        };
        Subject.prototype.complete = function () {
            var _this = this;
            errorContext(function () {
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    _this.isStopped = true;
                    var observers = _this.observers;
                    while (observers.length) {
                        observers.shift().complete();
                    }
                }
            });
        };
        Subject.prototype.unsubscribe = function () {
            this.isStopped = this.closed = true;
            this.observers = null;
        };
        Object.defineProperty(Subject.prototype, "observed", {
            get: function () {
                var _a;
                return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
            },
            enumerable: false,
            configurable: true
        });
        Subject.prototype._trySubscribe = function (subscriber) {
            this._throwIfClosed();
            return _super.prototype._trySubscribe.call(this, subscriber);
        };
        Subject.prototype._subscribe = function (subscriber) {
            this._throwIfClosed();
            this._checkFinalizedStatuses(subscriber);
            return this._innerSubscribe(subscriber);
        };
        Subject.prototype._innerSubscribe = function (subscriber) {
            var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
            return hasError || isStopped
                ? EMPTY_SUBSCRIPTION
                : (observers.push(subscriber), new Subscription(function () { return arrRemove(observers, subscriber); }));
        };
        Subject.prototype._checkFinalizedStatuses = function (subscriber) {
            var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
            if (hasError) {
                subscriber.error(thrownError);
            }
            else if (isStopped) {
                subscriber.complete();
            }
        };
        Subject.prototype.asObservable = function () {
            var observable = new Observable();
            observable.source = this;
            return observable;
        };
        Subject.create = function (destination, source) {
            return new AnonymousSubject(destination, source);
        };
        return Subject;
    }(Observable));
    var AnonymousSubject = (function (_super) {
        __extends(AnonymousSubject, _super);
        function AnonymousSubject(destination, source) {
            var _this = _super.call(this) || this;
            _this.destination = destination;
            _this.source = source;
            return _this;
        }
        AnonymousSubject.prototype.next = function (value) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
        };
        AnonymousSubject.prototype.error = function (err) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
        };
        AnonymousSubject.prototype.complete = function () {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
        };
        AnonymousSubject.prototype._subscribe = function (subscriber) {
            var _a, _b;
            return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
        };
        return AnonymousSubject;
    }(Subject));

    var BehaviorSubject = (function (_super) {
        __extends(BehaviorSubject, _super);
        function BehaviorSubject(_value) {
            var _this = _super.call(this) || this;
            _this._value = _value;
            return _this;
        }
        Object.defineProperty(BehaviorSubject.prototype, "value", {
            get: function () {
                return this.getValue();
            },
            enumerable: false,
            configurable: true
        });
        BehaviorSubject.prototype._subscribe = function (subscriber) {
            var subscription = _super.prototype._subscribe.call(this, subscriber);
            !subscription.closed && subscriber.next(this._value);
            return subscription;
        };
        BehaviorSubject.prototype.getValue = function () {
            var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, _value = _a._value;
            if (hasError) {
                throw thrownError;
            }
            this._throwIfClosed();
            return _value;
        };
        BehaviorSubject.prototype.next = function (value) {
            _super.prototype.next.call(this, (this._value = value));
        };
        return BehaviorSubject;
    }(Subject));

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter() {
      EventEmitter.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.usingDomains = false;

    EventEmitter.prototype.domain = undefined;
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function() {
      this.domain = null;
      if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active ) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };
        
    // Alias for removeListener added in NodeJS 10.0
    // https://nodejs.org/api/events.html#events_emitter_off_eventname_listener
    EventEmitter.prototype.off = function(type, listener){
        return this.removeListener(type, listener);
    };

    EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };

    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }

    /**
     *
     * Task is a simple record of a pending action.
     * it has three properties:
     * fn {Fundction} the pending action
     * args {[any]} any subsequent values passed through to perform
     * stop {boolean} a value indicating the calling context wants to
     */

    let _id = 0;

    class Task extends BehaviorSubject {
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

    const once = require('lodash/once');

    class ActionQueue extends EventEmitter {
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

    return ActionQueue;

}));
