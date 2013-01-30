// Generated by CoffeeScript 1.3.3
/*
	(c) 2013 Eikichi Yamaguchi
	kazitori.js may be freely distributed under the MIT license.
	http://dev.hageee.net

	inspired from::
//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
*/

var Deffered, EventDispatcher, Kazitori, KazitoriEvent, Rule, VARIABLE_TYPES, delegater, escapeRegExp, genericParam, namedParam, optionalParam, routeStripper, splatParam, trailingSlash,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

delegater = function(target, func) {
  return function() {
    return func.apply(target, arguments);
  };
};

trailingSlash = /\/$/;

routeStripper = /^[#\/]|\s+$/g;

escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

namedParam = /<(\w+|[A-Za-z_]+:\w+)>/g;

genericParam = /([A-Za-z_]+):(\w+)/;

optionalParam = /\((.*?)\)/g;

splatParam = /\*\w+/g;

VARIABLE_TYPES = [
  {
    name: "int",
    cast: Number
  }, {
    name: "string",
    cast: String
  }
];

/*
# ほとんど Backbone.Router と Backbone.History から拝借。
# jQuery や underscore に依存していないのでいろいろなライブラリと組み合わせられるはず。
# もっと高級なことしたけりゃ素直に Backbone 使うことをおぬぬめ。
#
*/


Kazitori = (function() {

  Kazitori.prototype.VERSION = "0.1.3";

  Kazitori.prototype.history = null;

  Kazitori.prototype.location = null;

  Kazitori.prototype.handlers = [];

  Kazitori.prototype.beforeHandlers = [];

  Kazitori.prototype.afterhandlers = [];

  Kazitori.prototype.root = null;

  Kazitori.prototype.notFound = null;

  Kazitori.prototype.beforeAnytimeHandler = null;

  Kazitori.prototype.direct = null;

  Kazitori.prototype.beforeFaildHandler = function() {};

  Kazitori.prototype.isBeforeForce = false;

  Kazitori.prototype.breaker = {};

  Kazitori.prototype._dispatcher = null;

  Kazitori.prototype._beforeDeffer = null;

  Kazitori.prototype._prevFragment = null;

  function Kazitori(options) {
    this.observeURLHandler = __bind(this.observeURLHandler, this);

    this.beforeFaild = __bind(this.beforeFaild, this);

    this.executeHandlers = __bind(this.executeHandlers, this);

    this.beforeComplete = __bind(this.beforeComplete, this);

    var docMode, win;
    this.options = options || (options = {});
    if (options.routes) {
      this.routes = options.routes;
    }
    this.root = options.root ? options.root : '/';
    this.notFound = options.notFound ? options.notFound : this.root;
    win = window;
    if (typeof win !== 'undefined') {
      this.location = win.location;
      this.history = win.history;
    }
    docMode = document.docmentMode;
    this.isOldIE = (win.navigator.userAgent.toLowerCase().indexOf('msie') !== -1) && (!docMode || docMode < 7);
    this._dispatcher = new EventDispatcher();
    this._bindBefores();
    this._bindRules();
    if (__indexOf.call(options, "isAutoStart") < 0 || options["isAutoStart"] !== false) {
      this.start();
    }
    return;
  }

  Kazitori.prototype.start = function(options) {
    var atRoot, fragment, frame, win;
    if (Kazitori.started) {
      throw new Error('mou hazim matteru');
    }
    Kazitori.started = true;
    win = window;
    this.options = this._extend({}, {
      root: '/'
    }, this.options, options);
    this._hasPushState = !!(this.history && this.history.pushState);
    this._wantChangeHash = this.options.hashChange !== false;
    fragment = this.getFragment();
    atRoot = this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    if (this.isOldIE && this._wantChangeHash) {
      frame = document.createElement("iframe");
      frame.setAttribute("src", "javascript:0");
      frame.setAttribute("tabindex", "-1");
      frame.style.display = "none";
      document.body.appendChild(frame);
      this.iframe = frame.contentWindow;
      this.change(fragment);
    }
    if (this._hasPushState === true) {
      win.addEventListener('popstate', this.observeURLHandler);
    } else if (this._wantChangeHash === true && (__indexOf.call(win, 'onhashchange') >= 0) && !this.isOldIE) {
      win.addEventListener('hashchange', this.observeURLHandler);
    }
    if (this._hasPushState && atRoot && this.location.hash) {
      this.fragment = this.getHash().replace(routeStripper, '');
      this.history.replaceState({}, document.title, this.root + this.fragment + this.location.search);
    }
    this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.START, this.fragment));
    if (!this.options.silent) {
      return this.loadURL();
    }
  };

  Kazitori.prototype.stop = function() {
    var win;
    win = window;
    win.removeEventListener('popstate', this.observeURLHandler);
    win.removeEventListener('hashchange', this.observeURLHandler);
    Kazitori.started = false;
    return this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.STOP, this.fragment));
  };

  Kazitori.prototype.torikazi = function(options) {
    return this.direction(options, "next");
  };

  Kazitori.prototype.omokazi = function(options) {
    return this.direction(options, "prev");
  };

  Kazitori.prototype.direction = function(option, direction) {
    if (!Kazitori.started) {
      return false;
    }
    this._prevFragment = this.getFragment();
    this.direct = direction;
    if (direction === "prev") {
      return this.history.back();
    } else if (direction === "next") {
      return this.history.forward();
    } else {

    }
  };

  Kazitori.prototype.change = function(fragment, options) {
    var frag, next, prev, url;
    if (!Kazitori.started) {
      return false;
    }
    prev = this.fragment;
    if (!options) {
      options = {
        'trigger': options
      };
    }
    frag = this.getFragment(fragment || '');
    if (this.fragment === frag) {
      return;
    }
    this.fragment = frag;
    next = this.fragment;
    /*
    		 memo : 20130129
    		 本家 Backbone もそうだけど
    		 URL にマッチするものがあるかどうかのテストってここでするべきじゃない?
    */

    url = this.root + frag.replace(routeStripper, '');
    if (this._matchCheck(this.fragment) === false) {
      if (this.notFound !== null) {
        this.change(this.notFound);
      }
      this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.NOT_FOUND));
      return;
    }
    if (this._hasPushState) {
      this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
    } else if (this._wantChangeHash) {
      this._updateHash(this.location, frag, options.replace);
      if (this.iframe && (frag !== this.getFragment(this.getHash(this.iframe)))) {
        if (!options.replace) {
          this.iframe.document.open().close();
        }
        this._updateHash(this.iframe.location, frag, options.replace);
      }
    } else {
      return this.location.assign(url);
    }
    this.dispatchEvent(new KazitoriEvent(KazitoriEvent.CHANGE, next, prev));
    this.loadURL(frag);
  };

  Kazitori.prototype.reject = function() {
    this.dispatchEvent({
      type: KazitoriEvent.REJECT
    });
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_COMPLETE, this.beforeComplete);
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_FAILD, this.beforeFaild);
    this._beforeDeffer = null;
  };

  Kazitori.prototype.registHandler = function(rule, name, isBefore, callback) {
    var target;
    if (!callback) {
      if (isBefore) {
        callback = this._bindFunctions(name);
      } else if (typeof name === "function") {
        callback = name;
      } else {
        callback = this[name];
      }
    }
    target = isBefore ? this.beforeHandlers : this.handlers;
    target.unshift(new Rule(rule, function(fragment) {
      var args;
      args = this._extractParams(fragment);
      return callback && callback.apply(this.router, args);
    }, this));
    return this;
  };

  Kazitori.prototype.loadURL = function(fragmentOverride) {
    var a, args, argsMatch, fragment, handler, i, len, matched, t, y, _i, _len, _ref, _ref1,
      _this = this;
    fragment = this.fragment = this.getFragment(fragmentOverride);
    matched = [];
    if (this.beforeAnytimeHandler || this.beforeHandlers.length > 0) {
      this._beforeDeffer = new Deffered();
      this._beforeDeffer.queue = [];
      this._beforeDeffer.index = -1;
      if (this.beforeAnytimeHandler != null) {
        this._beforeDeffer.deffered(function(d) {
          _this.beforeAnytimeHandler.callback(fragment);
          d.execute(d);
        });
      }
      y = 0;
      _ref = this.beforeHandlers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        handler = _ref[_i];
        if (handler.rule === fragment) {
          this._beforeDeffer.deffered(function(d) {
            handler.callback(fragment);
            d.execute(d);
          });
        } else if (handler.test(fragment) === true) {
          if (handler.isVariable && handler.types.length > 0) {
            args = handler._extractParams(this.fragment);
            argsMatch = [];
            len = args.length;
            i = 0;
            while (i < len) {
              a = args[i];
              t = handler.types[i];
              if (t === null || this._typeCheck(a, t) === true) {
                argsMatch.push(true);
              }
              i++;
            }
            if (_ref1 = !false, __indexOf.call(argsMatch, _ref1) >= 0) {
              this._beforeDeffer.deffered(function(d) {
                handler.callback(fragment);
                d.execute(d);
              });
            }
          } else {
            this._beforeDeffer.deffered(function(d) {
              handler.callback(fragment);
              d.execute(d);
            });
          }
        } else {
          return this.executeHandlers();
        }
      }
      this._beforeDeffer.addEventListener(KazitoriEvent.TASK_QUEUE_COMPLETE, this.beforeComplete);
      this._beforeDeffer.addEventListener(KazitoriEvent.TASK_QUEUE_FAILD, this.beforeFaild);
      return this._beforeDeffer.execute(this._beforeDeffer);
    } else {
      return this.executeHandlers();
    }
  };

  Kazitori.prototype.beforeComplete = function(event) {
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_COMPLETE, this.beforeComplete);
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_FAILD, this.beforeFaild);
    this._beforeDeffer.queue = [];
    this._beforeDeffer.index = -1;
    return this.executeHandlers();
  };

  Kazitori.prototype.executeHandlers = function() {
    var a, args, argsMatch, handler, i, len, matched, t, _i, _len, _ref, _ref1;
    matched = [];
    _ref = this.handlers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      handler = _ref[_i];
      if (handler.rule === this.fragment) {
        handler.callback(this.fragment);
        matched.push(true);
        return matched;
      }
      if (handler.test(this.fragment)) {
        if (handler.isVariable && handler.types.length > 0) {
          args = handler._extractParams(this.fragment);
          argsMatch = [];
          len = args.length;
          i = 0;
          while (i < len) {
            a = args[i];
            t = handler.types[i];
            if (t === null || this._typeCheck(a, t) === true) {
              argsMatch.push(true);
            }
            i++;
          }
          if (_ref1 = !false, __indexOf.call(argsMatch, _ref1) >= 0) {
            handler.callback(this.fragment);
            matched.push(true);
          }
        } else {
          handler.callback(this.fragment);
          matched.push(true);
        }
      }
    }
    if (matched.length < 1) {
      if (this.notFound !== null) {
        this.loadURL(this.notFound);
      }
      this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.NOT_FOUND));
    }
    return matched;
  };

  Kazitori.prototype.beforeFaild = function(event) {
    this.beforeFaildHandler.apply(this, arguments);
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_FAILD, this.beforeFaild);
    this._beforeDeffer.removeEventListener(KazitoriEvent.TASK_QUEUE_COMPLETE, this.beforeComplete);
    if (this.isBeforeForce) {
      this.beforeComplete();
    }
    return this._beforeDeffer = null;
  };

  Kazitori.prototype.observeURLHandler = function(event) {
    var current;
    current = this.getFragment();
    if (current === this.fragment && this.iframe) {
      current = this.getFragment(this.getHash(this.iframe));
    }
    if (current === this.fragment) {
      return false;
    }
    if (this.iframe) {
      this.change(current);
    }
    if (this.direct === "prev") {
      this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.PREV, current, this._prevFragment));
    } else if (this.direct === "next") {
      this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.NEXT, current, this._prevFragment));
    }
    this._dispatcher.dispatchEvent(new KazitoriEvent(KazitoriEvent.CHANGE, current, this._prevFragment));
    return this.loadURL(current);
  };

  Kazitori.prototype._bindRules = function() {
    var routes, rule, _i, _len;
    if (!(this.routes != null)) {
      return;
    }
    routes = this._keys(this.routes);
    for (_i = 0, _len = routes.length; _i < _len; _i++) {
      rule = routes[_i];
      this.registHandler(rule, this.routes[rule], false);
    }
  };

  Kazitori.prototype._bindBefores = function() {
    var befores, callback, key, _i, _len;
    if (!(this.befores != null)) {
      return;
    }
    befores = this._keys(this.befores);
    for (_i = 0, _len = befores.length; _i < _len; _i++) {
      key = befores[_i];
      this.registHandler(key, this.befores[key], true);
    }
    if (this.beforeAnytime) {
      callback = this._bindFunctions(this.beforeAnytime);
      this.beforeAnytimeHandler = {
        callback: this._binder(function(fragment) {
          var args;
          args = [fragment];
          return callback && callback.apply(this, args);
        }, this)
      };
    }
  };

  Kazitori.prototype._updateHash = function(location, fragment, replace) {
    var href;
    if (replace) {
      href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      location.hash = "#" + fragment;
    }
  };

  Kazitori.prototype._matchCheck = function(fragment) {
    var a, args, argsMatch, handler, i, len, matched, t, _i, _len, _ref, _ref1;
    matched = [];
    _ref = this.handlers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      handler = _ref[_i];
      if (handler.rule === fragment) {
        matched.push(true);
      }
      if (handler.test(fragment)) {
        if (handler.isVariable && handler.types.length > 0) {
          args = handler._extractParams(fragment);
          argsMatch = [];
          len = args.length;
          i = 0;
          while (i < len) {
            a = args[i];
            t = handler.types[i];
            if (t === null || this._typeCheck(a, t) === true) {
              argsMatch.push(true);
            }
            i++;
          }
          if (_ref1 = !false, __indexOf.call(argsMatch, _ref1) >= 0) {
            matched.push(true);
          }
        } else {
          matched.push(true);
        }
      }
    }
    if (__indexOf.call(matched, true) >= 0) {
      return true;
    } else {
      return false;
    }
  };

  Kazitori.prototype.getFragment = function(fragment) {
    var root;
    if (!(fragment != null)) {
      if (this._hasPushState || !this._wantChangeHash) {
        fragment = this.location.pathname;
        root = this.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) {
          fragment = fragment.substr(root.length);
        }
      } else {
        fragment = this.getHash();
      }
    }
    return fragment;
  };

  Kazitori.prototype.getHash = function() {
    var match;
    match = (window || this).location.href.match(/#(.*)$/);
    if (match != null) {
      return match[1];
    } else {
      return '';
    }
  };

  Kazitori.prototype._extractParams = function(rule, orgRule, fragment) {
    var param;
    param = rule.exec(fragment);
    if (param != null) {
      return param.slice(1);
    } else {
      return null;
    }
  };

  Kazitori.prototype.addEventListener = function(type, listener) {
    return this._dispatcher.addEventListener(type, listener);
  };

  Kazitori.prototype.removeEventListener = function(type, listener) {
    return this._dispatcher.removeEventListener(type, listener);
  };

  Kazitori.prototype.dispatchEvent = function(event) {
    return this._dispatcher.dispatchEvent(event);
  };

  Kazitori.prototype._slice = Array.prototype.slice;

  Kazitori.prototype._keys = Object.keys || function(obj) {
    var key, keys;
    if (obj === !Object(obj)) {
      throw new TypeError('object ja nai');
    }
    keys = [];
    for (key in obj) {
      if (Object.hasOwnProperty.call(obj, key)) {
        keys[keys.length] = key;
      }
    }
    return keys;
  };

  Kazitori.prototype._binder = function(func, obj) {
    var args, slice;
    slice = this._slice;
    args = slice.call(arguments, 2);
    return function() {
      return func.apply(obj || {}, args.concat(slice.call(arguments)));
    };
  };

  Kazitori.prototype._extend = function(obj) {
    this._each(this._slice.call(arguments, 1), function(source) {
      var prop, _results;
      if (source) {
        _results = [];
        for (prop in source) {
          _results.push(obj[prop] = source[prop]);
        }
        return _results;
      }
    });
    return obj;
  };

  Kazitori.prototype._each = function(obj, iter, ctx) {
    var each, i, k, l;
    if (!(obj != null)) {
      return;
    }
    each = Array.prototype.forEach;
    if (each && obj.forEach === each) {
      return obj.forEach(iter, ctx);
    } else if (obj.length === +obj.length) {
      i = 0;
      l = obj.length;
      while (i < l) {
        if (iter.call(ctx, obj[i], i, obj) === this.breaker) {
          return;
        }
        i++;
      }
    } else {
      for (k in obj) {
        if (__indexOf.call(obj, k) >= 0) {
          if (iter.call(ctx, obj[k], k, obj) === this.breaker) {
            return;
          }
        }
      }
    }
  };

  Kazitori.prototype._bindFunctions = function(funcs) {
    var bindedFuncs, callback, f, func, funcName, i, len, names, newF, _i, _len;
    if (typeof funcs === 'string') {
      funcs = funcs.split(',');
    }
    bindedFuncs = [];
    for (_i = 0, _len = funcs.length; _i < _len; _i++) {
      funcName = funcs[_i];
      func = this[funcName];
      if (!(func != null)) {
        names = funcName.split('.');
        if (names.length > 1) {
          f = window[names[0]];
          i = 1;
          len = names.length;
          while (i < len) {
            newF = f[names[i]];
            if (newF != null) {
              f = newF;
              i++;
            } else {
              break;
            }
          }
          func = f;
        } else {
          func = window[funcName];
        }
      }
      if (func != null) {
        bindedFuncs.push(func);
      }
    }
    callback = function(args) {
      var _j, _len1;
      for (_j = 0, _len1 = bindedFuncs.length; _j < _len1; _j++) {
        func = bindedFuncs[_j];
        func.apply(this, [args]);
      }
    };
    return callback;
  };

  Kazitori.prototype._typeCheck = function(a, t) {
    var matched, type, _i, _len;
    matched = false;
    for (_i = 0, _len = VARIABLE_TYPES.length; _i < _len; _i++) {
      type = VARIABLE_TYPES[_i];
      if (t.toLowerCase() === type.name) {
        if (type.cast(a)) {
          matched = true;
        }
      }
    }
    return matched;
  };

  return Kazitori;

})();

/*
/////////////////////////////
	URL を定義する Rule クラス
	ちょっと大げさな気もするけど外部的には変わらんし
	今後を見据えてクラス化しておく
/////////////////////////////
*/


Rule = (function() {

  Rule.prototype.rule = null;

  Rule.prototype._regexp = null;

  Rule.prototype.callback = null;

  Rule.prototype.router = null;

  Rule.prototype.isVariable = false;

  Rule.prototype.types = [];

  function Rule(string, callback, router) {
    var m, matched, re, t, _i, _len;
    this.rule = string;
    this.callback = callback;
    this._regexp = this._ruleToRegExp(string);
    this.router = router;
    this.types = [];
    re = new RegExp(namedParam);
    matched = string.match(re);
    if (matched !== null) {
      this.isVariable = true;
      for (_i = 0, _len = matched.length; _i < _len; _i++) {
        m = matched[_i];
        t = m.match(genericParam) || null;
        this.types.push(t !== null ? t[1] : null);
      }
    }
  }

  Rule.prototype.test = function(fragment) {
    return this._regexp.test(fragment);
  };

  Rule.prototype._extractParams = function(fragment) {
    var param;
    param = this._regexp.exec(fragment);
    if (param != null) {
      return param.slice(1);
    } else {
      return null;
    }
  };

  Rule.prototype._ruleToRegExp = function(rule) {
    var newRule;
    newRule = rule.replace(escapeRegExp, '\\$&');
    newRule = newRule.replace(optionalParam, '(?:$1)?');
    newRule = newRule.replace(namedParam, '([^\/]+)');
    newRule = newRule.replace(splatParam, '(.*?)');
    return new RegExp('^' + newRule + '$');
  };

  return Rule;

})();

EventDispatcher = (function() {

  function EventDispatcher() {}

  EventDispatcher.prototype.listeners = {};

  EventDispatcher.prototype.addEventListener = function(type, listener) {
    if (this.listeners[type] === void 0) {
      this.listeners[type] = [];
    }
    if (this.listeners[type].indexOf(listener === -1)) {
      this.listeners[type].push(listener);
    }
  };

  EventDispatcher.prototype.removeEventListener = function(type, listener) {
    var index;
    index = this.listeners[type].indexOf(listener);
    if (index !== -1) {
      this.listeners[type].splice(index, 1);
    }
  };

  EventDispatcher.prototype.dispatchEvent = function(event) {
    var ary, handler, _i, _len;
    ary = this.listeners[event.type];
    if (ary !== void 0) {
      event.target = this;
      for (_i = 0, _len = ary.length; _i < _len; _i++) {
        handler = ary[_i];
        handler.call(this, event);
      }
    }
  };

  return EventDispatcher;

})();

Deffered = (function(_super) {

  __extends(Deffered, _super);

  Deffered.prototype.queue = [];

  Deffered.prototype.index = -1;

  function Deffered() {
    this.queue = [];
    this.index = -1;
  }

  Deffered.prototype.deffered = function(func) {
    this.queue.push(func);
    return this;
  };

  Deffered.prototype.execute = function() {
    this.index++;
    try {
      if (this.queue[this.index]) {
        this.queue[this.index].apply(this, arguments);
        if (this.queue.length === this.index) {
          this.queue = [];
          this.index = -1;
          return this.dispatchEvent({
            type: KazitoriEvent.TASK_QUEUE_COMPLETE
          });
        }
      }
    } catch (error) {
      return this.reject(error);
    }
  };

  Deffered.prototype.reject = function(error) {
    return this.dispatchEvent({
      type: KazitoriEvent.TASK_QUEUE_FAILD,
      index: this.index,
      message: error.message
    });
  };

  return Deffered;

})(EventDispatcher);

KazitoriEvent = (function() {

  KazitoriEvent.prototype.next = null;

  KazitoriEvent.prototype.prev = null;

  KazitoriEvent.prototype.type = null;

  function KazitoriEvent(type, next, prev) {
    this.type = type;
    this.next = next;
    this.prev = prev;
  }

  KazitoriEvent.prototype.clone = function() {
    return new KazitoriEvent(this.type, this.next, this.prev);
  };

  KazitoriEvent.prototype.toString = function() {
    return "KazitoriEvent :: " + "type:" + this.type + " next:" + String(this.next) + " prev:" + String(this.prev);
  };

  return KazitoriEvent;

})();

KazitoriEvent.TASK_QUEUE_COMPLETE = 'task_queue_complete';

KazitoriEvent.TASK_QUEUE_FAILD = 'task_queue_faild';

KazitoriEvent.CHANGE = 'change';

KazitoriEvent.INTERNAL_CHANGE = 'internal_change';

KazitoriEvent.USER_CHANGE = 'user_change';

KazitoriEvent.PREV = 'prev';

KazitoriEvent.NEXT = 'next';

KazitoriEvent.REJECT = 'reject';

KazitoriEvent.NOT_FOUND = 'not_found';

KazitoriEvent.START = 'start';

KazitoriEvent.STOP = 'stop';

Kazitori.started = false;
