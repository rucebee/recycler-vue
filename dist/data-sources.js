"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AbstractSource = AbstractSource;
exports.ListSource = ListSource;
exports.WaterfallSource = WaterfallSource;
exports.HistorySource = HistorySource;
exports.ProxySource = ProxySource;

var _findIndex = _interopRequireDefault(require("lodash/findIndex"));

var _findLast2 = _interopRequireDefault(require("lodash/findLast"));

var _noop = _interopRequireDefault(require("lodash/noop"));

var _timeout = _interopRequireDefault(require("@rucebee/utils/src/timeout"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function AbstractSource() {
  var _this = this;

  var list = [];
  var recycler;
  this.attached = false;
  this.list = list;

  this.getItem = function (position) {
    return list[position];
  };

  this.itemCount = function () {
    return list.length;
  };

  this.indexOf = function (item, fromIndex) {
    return list.indexOf(item, fromIndex);
  };

  this.findIndex = function () {
    return _findIndex["default"].apply(void 0, [list].concat(Array.prototype.slice.call(arguments)));
  };

  this.insert = function (position) {
    for (var _len = arguments.length, items = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      items[_key - 1] = arguments[_key];
    }

    if (typeof position !== 'number') {
      position = _this.indexOf(position);
      if (position < 0) return;
      if (typeof items[0] === 'number') position += items.shift();
    }

    list.splice.apply(list, [position, 0].concat(items));

    _this.onInsert(position, items.length);

    return _this;
  };

  this.remove = function (position) {
    var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (typeof position !== 'number') {
      position = _this.indexOf(position);
      if (position < 0) return;
    }

    list.splice(position, count);

    _this.onRemove(position, count);

    return _this;
  };

  this.reset = function (_list) {
    if (list.length) _this.onRemove(0, list.length);
    list.length = 0;

    if (_list !== null && _list !== void 0 && _list.length) {
      list.push.apply(list, _toConsumableArray(_list));

      _this.onInsert(0, _list.length);
    }

    return _this;
  };

  this.attach = function (_recycler) {
    if (recycler !== _recycler) {
      _this.onRecyclerChanged(recycler, _recycler);

      _this.recycler = recycler = _recycler;
      _this.recyclerDataset = recycler.onDatasetChanged;
      _this.recyclerUpdate = recycler.onUpdate;
      _this.recyclerInsert = recycler.onInsert;
      _this.recyclerRemove = recycler.onRemove;
      _this.triggerUpdate = recycler.update;
      _this.startPosition = recycler.startPosition;
      _this.endPosition = recycler.endPosition;

      _this.recyclerDataset();

      if (!_this.attached) {
        _this.attached = true;

        _this.onAttach();
      }
    }
  };

  this.detach = function (_recycler) {
    if (_recycler && recycler !== _recycler) return;
    if (recycler) _this.onRecyclerChanged(recycler, null);
    _this.recycler = recycler = null;

    if (_this.attached) {
      _this.attached = false;

      _this.onDetach();
    }

    _this.recyclerDataset = _noop["default"];
    _this.recyclerUpdate = _noop["default"];
    _this.recyclerInsert = _noop["default"];
    _this.recyclerRemove = _noop["default"];
    _this.triggerUpdate = _noop["default"];

    _this.startPosition = function () {
      return 0;
    };

    _this.endPosition = function () {
      return -1;
    };
  };

  this.detach();
}

AbstractSource.prototype.onRecyclerChanged = _noop["default"];
AbstractSource.prototype.onAttach = _noop["default"];
AbstractSource.prototype.onDetach = _noop["default"];

AbstractSource.prototype.onUpdate = function (position, count) {
  this.recyclerUpdate(position, count);
};

AbstractSource.prototype.onInsert = function (position, count) {
  this.recyclerInsert(position, count);
};

AbstractSource.prototype.onRemove = function (position, count) {
  this.recyclerRemove(position, count);
};

AbstractSource.prototype.update = function () {
  for (var _len2 = arguments.length, items = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    items[_key2] = arguments[_key2];
  }

  for (var _i = 0, _items = items; _i < _items.length; _i++) {
    var item = _items[_i];
    var position = typeof item !== 'number' ? this.indexOf(item) : item;
    if (position > -1) this.onUpdate(position, 1);
  }

  return this;
};

AbstractSource.prototype.each = function (fn) {
  for (var i = 0; i < this.list.length; i++) {
    fn(this.list[i], i);
  }

  return this;
};

function PeriodicRefresh(query, period) {
  var _this2 = this;

  var before = 0,
      nextTimeout = (0, _timeout["default"])(0),
      attached = false;

  var next = function next() {
    var now = Date.now();

    if (before <= now) {
      _this2.query();
    } else if (period && !_this2.request) {
      nextTimeout.stop();
      nextTimeout = (0, _timeout["default"])(before - now + 1000);
      nextTimeout.then(function () {
        if (attached) _this2.query();
      }, _noop["default"]);
    }
  };

  this.request = null;

  this.attach = function () {
    if (!attached) {
      attached = true;
      next();
    }
  };

  this.detach = function () {
    if (attached) {
      attached = false;
      nextTimeout.stop();
    }
  };

  this.period = function (_period) {
    period = _period;

    if (period) {
      before = Date.now() + period;
      next();
    } else {
      nextTimeout.stop();
    }
  };

  this.query = function (dirty) {
    if (_this2.request) {
      if (dirty) before = 0;
    } else if (!attached) {
      before = 0;
    } else {
      before = period ? Date.now() + period : Number.MAX_SAFE_INTEGER;
      nextTimeout.stop(true);
      _this2.request = query().then(function () {
        _this2.request = null;
        if (attached) next();
      })["catch"](function (err) {
        console.error(err);

        if (attached) {
          nextTimeout = (0, _timeout["default"])(5000, function () {
            _this2.request = null;
          });
          nextTimeout.then(function () {
            if (attached) _this2.query();
          }, _noop["default"]);
        } else {
          _this2.request = null;
          before = 0;
        }

        throw err;
      });
    }
  };
}

function ListSource(query, period) {
  var _this3 = this;

  AbstractSource.call(this);
  var list = this.list,
      refresh = new PeriodicRefresh(function () {
    return query.call(_this3).then(function (_list) {
      _this3.onRemove(0, list.length);

      list.length = 0;

      _this3.insert.apply(_this3, [0].concat(_toConsumableArray(_list)));
    });
  }, period);
  this.onAttach = refresh.attach;
  this.onDetach = refresh.detach;
  this.refresh = refresh.query;
}

ListSource.prototype = Object.create(AbstractSource.prototype);
ListSource.prototype.constructor = ListSource;

function subscribeRecyclerLaidout(from, to) {
  if (from) from.$off('laidout', this.recyclerLaidout);
  if (to) to.$on('laidout', this.recyclerLaidout);
}

function WaterfallSource(query, limit, loadingItem) {
  var _this4 = this;

  AbstractSource.call(this);
  var list = this.list,
      viewDistance = limit >> 1,
      refresh = new PeriodicRefresh(function () {
    var item = (0, _findLast2["default"])(list, 'id', list.length - 2);
    return query.call(_this4, item, limit).then(function (_list) {
      var _findLast;

      if ((item === null || item === void 0 ? void 0 : item.id) !== ((_findLast = (0, _findLast2["default"])(list, 'id', list.length - 2)) === null || _findLast === void 0 ? void 0 : _findLast.id)) return;

      if (_list !== null && _list !== void 0 && _list.length) {
        _this4.insert.apply(_this4, [list.length - 1].concat(_toConsumableArray(_list)));

        var startPos = _this4.startPosition();

        if (startPos > limit) _this4.remove(0, startPos - viewDistance);

        _this4.triggerUpdate();
      } else if (loading) {
        loading = false;

        _this4.remove(loadingItem);
      }
    });
  }, 0);
  var loading = false,
      attached = false;

  this.onAttach = function () {
    attached = true;

    if (!loading) {
      loading = true;

      _this4.insert(list.length, loadingItem);
    }

    refresh.attach();
  };

  this.onDetach = function () {
    attached = false;
    refresh.detach();
  };

  this.reset = function () {
    var len = list.length;

    _this4.onRemove(0, len);

    list.length = 0;

    if (attached) {
      _this4.insert(list.length, loadingItem);

      loading = true;
    }
  };

  this.recyclerLaidout = function (position, hs) {
    if (loading && position + hs.length - 1 + viewDistance >= list.length) refresh.query();
  };

  this.cut = function (position) {
    var len = list.length - position - 2;
    if (loading) len--;
    if (len < 1) return;

    _this4.remove(position + 1, len);

    if (!loading) {
      loading = true;

      _this4.insert(list.length, loadingItem);
    }

    _this4.triggerUpdate();
  };
}

WaterfallSource.prototype = Object.create(AbstractSource.prototype);
WaterfallSource.prototype.constructor = WaterfallSource;
WaterfallSource.prototype.onRecyclerChanged = subscribeRecyclerLaidout;

function HistorySource(queryNext, queryHistory, limit, loadingItem) {
  var _this5 = this;

  var fromItem = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
  var period = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
  var historyItem = arguments.length > 6 ? arguments[6] : undefined;
  AbstractSource.call(this);
  if (!historyItem) historyItem = loadingItem;
  var autoHistory = historyItem.type === 'loading';
  var firstIndex = 1,
      enabled = true,
      attached = false;

  var list = this.list,
      viewDistance = limit >> 1,
      cutHistory = function cutHistory() {
    var startPos = _this5.startPosition();

    if (startPos > limit && startPos - viewDistance < list.length - firstIndex) {
      _this5.remove(firstIndex, startPos - viewDistance);

      if (!firstIndex) {
        firstIndex = 1;

        _this5.insert(0, historyItem);
      } //console.log('cutHistory', firstIndex, startPos - viewDistance, list[firstIndex])


      return true;
    }
  },
      nextRefresh = new PeriodicRefresh(function () {
    return queryNext.call(_this5, list.length <= firstIndex ? fromItem : list[list.length - 1], limit).then(function (_list) {
      //console.log('nextRefresh', {list, _list})
      if (!fromItem && firstIndex) {
        _this5.remove(0, 1);

        _this5.insert(0, historyItem);
      }

      if (_list.length) {
        if (list.length <= firstIndex) {
          _this5.insert.apply(_this5, [list.length].concat(_toConsumableArray(_list)));
        } else {
          _this5.insert.apply(_this5, [list.length].concat(_toConsumableArray(_list)));

          if (!historyRefresh.request) cutHistory();
        }

        if (_list.length >= limit) {
          if (!fromItem) nextRefresh.query(true);
        } else {
          if (firstIndex) {
            firstIndex = 0;

            _this5.remove(0, 1);
          }

          if (fromItem) {
            fromItem = null;
            nextRefresh.period(period);
          }
        }
      } else if (list.length <= firstIndex && firstIndex) {
        firstIndex = 0;

        _this5.remove(0, 1);
      } else if (!historyRefresh.request) {
        cutHistory();
      }
    });
  }, fromItem ? 0 : period),
      historyRefresh = new PeriodicRefresh(function () {
    if (!firstIndex || list.length <= firstIndex) return Promise.resolve();
    var item = list[firstIndex];
    return queryHistory.call(_this5, list[firstIndex], limit).then(function (_list) {
      if (!_list || !firstIndex || list.length <= firstIndex || item.id !== list[firstIndex].id || cutHistory()) return;
      if (_list.length) _this5.insert.apply(_this5, [firstIndex].concat(_toConsumableArray(_list)));

      if (_list.length < limit) {
        firstIndex = 0;

        _this5.remove(0);
      } else {
        _this5.triggerUpdate();
      }
    });
  }, 0);

  list.push(loadingItem);

  this.empty = function () {
    return list.length <= firstIndex;
  };

  this.refresh = nextRefresh.query;

  this.refreshHistory = function () {
    historyRefresh.query();
  };

  this._onAttach = function () {
    attached = true;

    if (enabled) {
      nextRefresh.attach();
      historyRefresh.attach();
    }
  };

  this._onDetach = function () {
    attached = false;
    nextRefresh.detach();
    historyRefresh.detach();
  };

  this.setEnabled = function (_enabled) {
    enabled = _enabled;

    if (attached) {
      if (enabled) _this5.onAttach();else _this5.onDetach();
    }
  };

  this.recyclerLaidout = function (position, hs) {
    //console.log('recyclerLaidout', {position, hs, firstIndex, list, fromItem})
    if (firstIndex && list.length > firstIndex) {
      if (autoHistory && position <= viewDistance) historyRefresh.query();
      if (fromItem && position + hs.length - 1 + viewDistance >= list.length) nextRefresh.query();
    }
  };
}

HistorySource.prototype = Object.create(AbstractSource.prototype);
HistorySource.prototype.constructor = HistorySource;

HistorySource.prototype.onAttach = function () {
  this._onAttach();
};

HistorySource.prototype.onDetach = function () {
  this._onDetach();
};

HistorySource.prototype.onRecyclerChanged = subscribeRecyclerLaidout;

function ProxySource() {
  var _this6 = this;

  for (var _len3 = arguments.length, srcs = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    srcs[_key3] = arguments[_key3];
  }

  AbstractSource.call(this);
  this.srcs = srcs;
  var self = this,
      list = this.list;
  var attached = false,
      maxCount = null;

  var recyclerProxy = function recyclerProxy(src, index) {
    return {
      onDatasetChanged: function onDatasetChanged() {
        list.length = 0;

        for (var i = 0; i < srcs.length; i++) {
          list.push.apply(list, _toConsumableArray(srcs[i].list));
        }

        _this6.recycler.onDatasetChanged();
      },
      onUpdate: function onUpdate(position, count) {
        var base = 0;

        for (var i = 0; i < index; i++) {
          base += srcs[i].itemCount();
        }

        list.splice.apply(list, [base + position, count].concat(_toConsumableArray(src.list.slice(position, position + count))));

        _this6.recycler.onUpdate(base + position, count);

        _this6.recycler.$emit('changed', index, src, base);
      },
      onInsert: function onInsert(position, count) {
        var base = 0;

        for (var i = 0; i < index; i++) {
          base += srcs[i].itemCount();
        } //console.log('onInsert', {position, count, base, index})


        list.splice.apply(list, [base + position, 0].concat(_toConsumableArray(src.list.slice(position, position + count))));

        _this6.recycler.onInsert(base + position, count);

        _this6.recycler.$emit('changed', index, src, base);
      },
      onRemove: function onRemove(position, count) {
        var base = 0;

        for (var i = 0; i < index; i++) {
          base += srcs[i].itemCount();
        } //console.log('onRemove', {position, count, base})


        list.splice(base + position, count);

        _this6.recycler.onRemove(base + position, count);

        _this6.recycler.$emit('changed', index, src, base);
      },
      update: function update() {
        _this6.recycler.update();
      },
      startPosition: function startPosition() {
        var base = 0;

        for (var i = 0; i < index; i++) {
          base += srcs[i].itemCount();
        }

        return _this6.recycler.startPosition() - base;
      },
      endPosition: function endPosition() {
        var base = 0;

        for (var i = 0; i < index; i++) {
          base += srcs[i].itemCount();
        }

        return _this6.recycler.endPosition() - base;
      },
      $on: _noop["default"],
      $off: _noop["default"],
      $emit: function $emit() {
        var _this6$recycler;

        return (_this6$recycler = _this6.recycler).$emit.apply(_this6$recycler, arguments);
      },
      $notify: function $notify() {
        var _this6$recycler2;

        return (_this6$recycler2 = _this6.recycler).$notify.apply(_this6$recycler2, arguments);
      },

      get $router() {
        return self.recycler.$router;
      }

    };
  };

  this.setMaxCount = function () {
    var count = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var prevCount = maxCount;
    maxCount = count;
    if (!_this6.recycler) return;

    if (count === null) {
      if (prevCount !== null && _this6.list.length > prevCount) _this6.recycler.onInsert(prevCount, _this6.list.length - prevCount);
    } else if (count < _this6.list.length) {
      _this6.recycler.onRemove(count, _this6.list.length - count);
    }
  };

  this.getMaxCount = function () {
    return maxCount;
  };

  this.itemCount = function () {
    return maxCount !== null ? Math.min(maxCount, list.length) : list.length;
  };

  this.getBase = function (index) {
    if (index >= srcs.length) index = srcs.length - 1;
    var base = 0;

    for (var i = 0; i < index; i++) {
      //console.log({i, count: srcs[i].itemCount()})
      base += srcs[i].itemCount();
    }

    return base;
  };

  this._onAttach = function () {
    attached = true;
    list.length = 0;

    for (var i = 0; i < srcs.length; i++) {
      list.push.apply(list, _toConsumableArray(srcs[i].list));
      srcs[i].attach(recyclerProxy(srcs[i], i));
    }
  };

  this._onDetach = function () {
    attached = false;

    for (var i = 0; i < srcs.length; i++) {
      srcs[i].detach();
    }
  };

  this.recyclerLaidout = function (position, hs) {
    var base = 0;

    for (var i = 0; i < srcs.length; i++) {
      var src = srcs[i];

      if (src.recyclerLaidout) {
        if (position + hs.length - 1 >= base && position < base + src.itemCount()) src.recyclerLaidout( //position < base ? 0 : position - base,
        Math.max(0, position - base), hs.slice( //position < base ? base - position : 0,
        Math.max(0, base - position), //position + hs.length, base + src.itemCount() < position + hs.length ? hs.length - base + src.itemCount() - position : hs.length,
        hs.length - Math.max(0, base - src.itemCount() + position)), base);
      }

      base += src.itemCount();
    }
  };
}

ProxySource.prototype = Object.create(AbstractSource.prototype);
ProxySource.prototype.constructor = ProxySource;

ProxySource.prototype.onAttach = function () {
  this._onAttach();
};

ProxySource.prototype.onDetach = function () {
  this._onDetach();
};

ProxySource.prototype.onRecyclerChanged = subscribeRecyclerLaidout;