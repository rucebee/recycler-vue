"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AbstractSource = AbstractSource;
exports.ListSource = ListSource;
exports.WaterfallSource = WaterfallSource;
exports.HistorySource = HistorySource;

var _lodashEs = require("lodash-es");

var _utils = require("@rucebee/utils");

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
    return _lodashEs.findIndex.apply(void 0, [list].concat(Array.prototype.slice.call(arguments)));
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

  this.lockTop = function (fn) {
    if (!recycler) {
      fn();
      return;
    }

    var position = recycler.startPosition();

    var item = _this.getItem(position),
        offset = recycler.offset(position);

    fn();

    if (offset) {
      position = _this.indexOf(item);
      if (position > -1) recycler.position(position, offset);
    }
  };

  this.attach = function (_recycler) {
    if (recycler != _recycler) {
      _this.onRecyclerChanged(recycler, _recycler);

      _this.recycler = recycler = _recycler;
      _this.onDatasetChanged = recycler.onDatasetChanged;
      _this.recyclerUpdate = recycler.onUpdate;
      _this.recyclerInsert = recycler.onInsert;
      _this.recyclerRemove = recycler.onRemove;
      _this.triggerUpdate = recycler.update;
      _this.startPosition = recycler.startPosition;
      _this.endPosition = recycler.endPosition;

      _this.onDatasetChanged();

      if (!_this.attached) {
        _this.attached = true;

        _this.onAttach();
      }
    }
  };

  this.detach = function (_recycler) {
    if (recycler !== _recycler) return;
    if (recycler) _this.onRecyclerChanged(recycler, null);
    _this.recycler = recycler = null;

    if (_this.attached) {
      _this.attached = false;

      _this.onDetach();
    }

    _this.onDatasetChanged = _lodashEs.noop;
    _this.recyclerUpdate = _lodashEs.noop;
    _this.recyclerInsert = _lodashEs.noop;
    _this.recyclerRemove = _lodashEs.noop;
    _this.triggerUpdate = _lodashEs.noop;

    _this.startPosition = function () {
      return 0;
    };

    _this.endPosition = function () {
      return -1;
    };
  };

  this.detach();
}

AbstractSource.prototype.onRecyclerChanged = _lodashEs.noop;
AbstractSource.prototype.onAttach = _lodashEs.noop;
AbstractSource.prototype.onDetach = _lodashEs.noop;

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
      nextTimeout = (0, _utils.timeout)(0),
      attached = false;

  var next = function next() {
    var now = Date.now();

    if (before <= now) {
      _this2.query();
    } else if (period && !_this2.request) {
      nextTimeout.stop();
      nextTimeout = (0, _utils.timeout)(before - now + 1000);
      nextTimeout.then(function () {
        if (attached) _this2.query();
      }, _lodashEs.noop);
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
          nextTimeout = (0, _utils.timeout)(5000, function () {
            _this2.request = null;
          });
          nextTimeout.then(function () {
            if (attached) _this2.query();
          }, _lodashEs.noop);
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

function onRecyclerChanged(from, to) {
  if (from) {
    from.$off('laidout', this.recyclerLaidout);
  } else if (to) {
    to.$on('laidout', this.recyclerLaidout);
  }
}

function WaterfallSource(query, limit, loadingItem) {
  var _this4 = this;

  AbstractSource.call(this);
  var list = this.list,
      viewDistance = limit >> 1,
      refresh = new PeriodicRefresh(function () {
    return query.call(_this4, (0, _lodashEs.findLast)(list, 'id', list.length - 2), limit).then(function (_list) {
      // if(list.length > 1)
      //     return
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
  var loading = false;

  this.onRange = function (startPos, endPos) {
    if (loading && endPos + viewDistance >= list.length) refresh.query();
  };

  this.onAttach = function () {
    if (!loading) {
      loading = true;

      _this4.insert(list.length, loadingItem);
    }

    refresh.attach();
  };

  this.onDetach = refresh.detach;

  this.recyclerLaidout = function (position, hs) {
    if (loading && position + hs.length - 1 + viewDistance >= list.length) refresh.query();
  };
}

WaterfallSource.prototype = Object.create(AbstractSource.prototype);
WaterfallSource.prototype.constructor = WaterfallSource;
WaterfallSource.prototype.onRecyclerChanged = onRecyclerChanged;

function HistorySource(queryNext, queryHistory, limit, loadingItem) {
  var _this5 = this;

  var fromId = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var period = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
  AbstractSource.call(this);
  var oldestItem = null,
      latestItem = null,
      enabled = true,
      attached = false; // Object.defineProperty(this, 'latest', {
  //     get: () => latestItem,
  //     set: value => {
  //         latestItem = value
  //     }
  // })

  var list = this.list,
      viewDistance = limit >> 1,
      cutHistory = function cutHistory() {
    var startPos = _this5.startPosition(),
        firstIndex = oldestItem || !latestItem && list.length ? 1 : 0;

    if (startPos > limit && startPos - viewDistance < list.length - firstIndex) {
      _this5.remove(firstIndex, startPos - viewDistance);

      var prevItem = oldestItem;
      oldestItem = list[firstIndex];
      if (_this5.attached && !prevItem) historyRefresh.attach();
      console.log('cutHistory', firstIndex, startPos - viewDistance, oldestItem);
      if (!firstIndex) _this5.insert(0, loadingItem);
      return true;
    }
  },
      nextRefresh = new PeriodicRefresh(function () {
    return queryNext.call(_this5, latestItem).then(function (_list) {
      if (_list.length) {
        latestItem = _list[_list.length - 1];

        _this5.insert.apply(_this5, [list.length].concat(_toConsumableArray(_list)));

        if (!oldestItem) {
          oldestItem = _list[0];
          if (_this5.attached) historyRefresh.attach();

          _this5.triggerUpdate();
        }

        if (!historyRefresh.request) {
          cutHistory();
        }
      } else if (!latestItem && list.length) {
        _this5.remove(0, list.length);
      } else if (!historyRefresh.request) {
        cutHistory();
      }
    });
  }, period),
      historyRefresh = new PeriodicRefresh(function () {
    return queryHistory.call(_this5, oldestItem, limit).then(function (_list) {
      if (!cutHistory()) {
        var prevItem = oldestItem;

        if (_list.length) {
          oldestItem = _list[0];
          if (_this5.attached && !prevItem) historyRefresh.attach();

          _this5.insert.apply(_this5, [1].concat(_toConsumableArray(_list)));

          _this5.triggerUpdate();
        } else {
          oldestItem = null;
          if (_this5.attached && prevItem) historyRefresh.detach();

          _this5.remove(0);
        }
      }
    });
  }, 0);

  list.push(loadingItem);
  this.refresh = nextRefresh.query;

  this._onAttach = function () {
    attached = true;

    if (enabled) {
      nextRefresh.attach();
      if (oldestItem) historyRefresh.attach();
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
    if (oldestItem && position <= viewDistance) historyRefresh.query();
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

HistorySource.prototype.onRecyclerChanged = onRecyclerChanged;