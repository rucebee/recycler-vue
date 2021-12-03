"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defaults = _interopRequireDefault(require("lodash/defaults"));

var _mergeWith = _interopRequireDefault(require("lodash/mergeWith"));

var _findIndex = _interopRequireDefault(require("lodash/findIndex"));

var _isFunction = _interopRequireDefault(require("lodash/isFunction"));

var _noop = _interopRequireDefault(require("lodash/noop"));

var _animate = _interopRequireDefault(require("@rucebee/utils/src/animate"));

var _is_iOS = _interopRequireDefault(require("@rucebee/utils/src/is_iOS"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var mmin = Math.min,
    mmax = Math.max,
    mfloor = Math.floor,
    mround = Math.round,
    mabs = Math.abs,
    NEAR_ZERO = .0001,
    NEAR_ONE = 1 - NEAR_ZERO;

function beforeCreate() {
  var el,
      win,
      doc,
      isWindow,
      isFixed,
      wrapper,
      container,
      _source,
      _itemCount,
      _getItem,
      _stackFromBottom2,
      _stickToTop,
      emptySlot,
      hsCache = {};

  var vm = this,
      slots = {},
      hs = [],
      hsBinded = [],
      timeStamp = Date.now() <= new Event('check').timeStamp ? Date.now : performance.now.bind(performance),
      _scroll = function _scroll(top) {
    win.scrollTo(doc.scrollLeft, top);
    scrollTime = timeStamp(); //console.log('_scroll', top, scrollTime)
  },
      _windowHeight = function _windowHeight() {
    var EMPTY_DIV = document.createElement('div');
    EMPTY_DIV.style.height = '100vh';
    EMPTY_DIV.style.width = 0;
    EMPTY_DIV.style.position = 'absolute';
    document.body.append(EMPTY_DIV);
    var height = EMPTY_DIV.clientHeight;
    EMPTY_DIV.remove();
    return height;
  },
      _bodyHeight = function _bodyHeight() {
    var EMPTY_DIV = document.createElement('div'),
        ADD_1PX = el.offsetHeight ? 0 : 1;
    EMPTY_DIV.style.height = '1px';
    if (ADD_1PX) el.style.minHeight = '1px';
    var height = 0; //let stat

    for (var i = 0; i < doc.childElementCount; i++) {
      var c = doc.children[i],
          computedStyle = c.currentStyle || getComputedStyle(c);
      c.append(EMPTY_DIV);
      var r = c.getBoundingClientRect(),
          h = r.bottom - doc.offsetTop + doc.scrollTop + (parseInt(computedStyle.marginBottom) || 0) - 1 - ADD_1PX;

      if (height < h) {
        height = h; //stat = [c, h, r, doc.offsetTop, doc.scrollTop, c.offsetTop, c.offsetHeight]
      }

      EMPTY_DIV.remove();
    }

    if (ADD_1PX) el.style.minHeight = ''; //console.log(...stat)

    return height;
  };

  var _clientHeight,
      updateId,
      itemCount = 0,
      maxPosition = -1,
      _position2 = -1,
      offset = 0,
      hsPosition = 0,
      hsOffset = 0,
      hsHeight = 0,
      allShown = true,
      windowHeight,
      clientHeight,
      clientHeightOld,
      clientHeightEx,
      scrollHeight = 0,
      headerHeight = 0,
      footerHeight = 0,
      firstHeight = 0,
      lastHeight = 0,
      scrollTop,
      scrollMax,
      scrollRatio,
      maxOffset,
      scrollTime = 0,
      posId,
      posResolve,
      posPosition,
      posOffset;

  var update = function update() {
    if (updateId) cancelAnimationFrame(updateId);
    updateId = requestAnimationFrame(updateFrame);
  },
      updateCancel = function updateCancel() {
    if (updateId) {
      cancelAnimationFrame(updateId);
      updateId = 0;
    }
  },
      updateNow = function updateNow() {
    updateCancel();
    updateFrame();
  };

  function hsPop(position) {
    var h;

    if (hsBinded[position]) {
      h = hsBinded[position];
      delete hsBinded[position]; //console.log('binded', position)

      return h;
    }

    var item = _getItem(position),
        type = (item === null || item === void 0 ? void 0 : item.type) || 'default',
        hsTypeCache = hsCache[type];

    if (!hsTypeCache) hsCache[type] = hsTypeCache = [];

    if (item !== null && item !== void 0 && item.id) {
      var index = (0, _findIndex["default"])(hsTypeCache, ['id', item.id]);
      if (index < 0) index = (0, _findIndex["default"])(hsTypeCache, ['id', undefined]);

      if (index > -1) {
        h = hsTypeCache[index];
        hsTypeCache.splice(index, 1);
      }
    } else {
      h = hsTypeCache.pop();
    }

    if (!h) {
      var factory = slots[type] || emptySlot;
      h = factory();
      h.position = position;
      h.$mount();
      h._isMounted = true;

      if (h.$options.mounted) {
        var _iterator = _createForOfIteratorHelper(h.$options.mounted),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var hook = _step.value;
            hook.call(h);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      var _iterator2 = _createForOfIteratorHelper(h.$children),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var c = _step2.value;

          if (c.$options.mounted) {
            var _iterator3 = _createForOfIteratorHelper(c.$options.mounted),
                _step3;

            try {
              for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                var _hook = _step3.value;

                _hook.call(c);
              }
            } catch (err) {
              _iterator3.e(err);
            } finally {
              _iterator3.f();
            }
          }
        } //vm.callHook(vm, 'mounted')
        //h.$emit = (...args) => vm.$emit.apply(vm, args)

      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      h._watcher.active = false;
      h.position = -1;
      h.position = position;
      h.style = h.$el.style;
      var style = h.style,
          computedStyle = h.$el.currentStyle || getComputedStyle(h.$el);
      style.position = 'absolute';
      style.left = 0;
      style.right = 0;
      container.append(h.$el);
      h.marginTop = parseFloat(computedStyle.marginTop) || 0;
      h.marginBottom = parseFloat(computedStyle.marginBottom) || 0;
      style.marginTop = 0;
      style.marginBottom = 0;

      if (computedStyle.maxHeight.endsWith('%')) {
        h.maxHRatio = (parseFloat(computedStyle.maxHeight) || 0) / 100;
        style.maxHeight = 'initial';
      }

      if (computedStyle.minHeight.endsWith('%')) {
        h.minHRatio = (parseFloat(computedStyle.minHeight) || 0) / 100;
        style.minHeight = 'initial';
      } else {
        h.minHeight = parseFloat(computedStyle.minHeight) || h.$el.offsetHeight;
      } //console.log('create', position)

    } else {
      if (!h.$el.parentElement) container.append(h.$el); //h.style.display = ''

      h.position = -1;
      h.position = position;

      h._update(h._render(), false); //console.log('bind', position, h.source)

    }

    h.id = item === null || item === void 0 ? void 0 : item.id;
    h.top = position ? 0 : headerHeight;

    if (h.calcHeight) {
      h.$el.style.height = '';
      h.height = h.$el.offsetHeight + h.top;
      if (position === maxPosition) h.height += footerHeight;
      var _height = clientHeight;

      for (var i = position - 1; i >= 0; i--) {
        var _h = void 0;

        if (i >= hsPosition && i < hsPosition + hs.length) {
          _h = hs[i - hsPosition];
        } else {
          hsPush(_h = hsPop(i));
        }

        if (_h.calcHeight) break;
        _height -= _h.height;
        if (_height <= h.height) break;
      }

      if (h.height < _height) {
        h.$el.style.height = _height - h.top - footerHeight + 'px';
        if (position !== maxPosition) _height -= footerHeight;
        h.height = _height;
      }
    } else if (h.maxHRatio > 0) {
      if (h.minHRatio) h.minHeight = h.minHRatio * (windowHeight - headerHeight - footerHeight) - h.marginBottom;
      h.height = mmax(h.minHeight, h.maxHRatio * (windowHeight - headerHeight - footerHeight) - h.marginBottom) + h.top + (position === maxPosition ? footerHeight : 0); //Doing it later:
      //h.style.height = h.height + 'px'
    } else {
      h.height = h.$el.offsetHeight + h.top;
      if (position === maxPosition) h.height += footerHeight;
    }

    return h;
  }

  function hsPush(h) {
    if (h.height) {
      hsBinded[h.position] = h;
      return;
    }

    var type = h.type,
        hsTypeCache = hsCache[type]; //h.$el.remove()
    //h.style.display = 'none'

    if (!hsTypeCache) {
      //console.log('hsPush', {hsCache, slots, type, h})
      hsCache[type] = hsTypeCache = [];
    }

    hsTypeCache.push(h);
  }

  function hsFlush() {
    for (var i in hsBinded) {
      var h = hsBinded[i];
      h.height = 0;
      hsPush(h);
    }

    hsBinded.length = 0;

    for (var type in hsCache) {
      var hsTypeCache = hsCache[type];

      var _iterator4 = _createForOfIteratorHelper(hsTypeCache),
          _step4;

      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var _h2 = _step4.value;

          if (_h2.$el.parentElement) {
            //console.log('hsFlush.remove', {'h.type': h.type, 'h.position': h.position})
            _h2.$el.remove();
          }
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
  }

  function hsInvalidate(_position, count) {
    if (hsPosition >= itemCount) {
      if (_position <= 1) firstHeight = 0;
      lastHeight = 0;

      var _iterator5 = _createForOfIteratorHelper(hs),
          _step5;

      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var h = _step5.value;
          h.height = 0;
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }

      return true;
    }

    if (!count) return true;

    if (_position - 1 >= hsPosition && _position - 1 <= hsPosition + hs.length || hsPosition >= _position - 1 && hsPosition <= _position + count + 1) {
      if (_position <= 1) firstHeight = 0;
      if (_position + count + 1 >= itemCount) lastHeight = 0;

      for (var i = mmax(0, _position - 1 - hsPosition), len = mmin(hs.length, _position + count + 1 - hsPosition); i < len; i++) {
        hs[i].height = 0;
      }

      return true;
    }

    if (_position + count + 1 >= itemCount && lastHeight) {
      if (_position <= 1) firstHeight = 0;
      lastHeight = 0;
      return true;
    }

    if (_position <= 1) {
      firstHeight = 0;
      return true;
    }
  }

  function hsCleanUp() {
    while (hs.length) {
      hsPush(hs.pop());
    }

    hsFlush();

    for (var type in hsCache) {
      var hsTypeCache = hsCache[type];

      var _iterator6 = _createForOfIteratorHelper(hsTypeCache),
          _step6;

      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var h = _step6.value;
          h.$destroy();
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }

    hsCache = {};
  }

  function _scrollMax() {
    var fluidCount = 0,
        fluidHeight = 0;

    var _iterator7 = _createForOfIteratorHelper(hs),
        _step7;

    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var h = _step7.value;

        if (h.maxHRatio) {
          fluidCount++;
          fluidHeight += h.height;
        }
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }

    var height = hs.length === itemCount ? hsHeight : mround(mmin(9 * clientHeight, itemCount === fluidCount ? fluidHeight : hs.length > fluidCount ? (hsHeight - fluidHeight) * itemCount / (hs.length - fluidCount) + fluidHeight : 2 * clientHeight)); //console.log({height, scrollHeight, clientHeight})

    if (scrollHeight !== height) {
      scrollHeight = height;
      wrapper.style.height = scrollHeight - headerHeight - footerHeight + 'px';
      if (isFixed) container.style.width = wrapper.offsetWidth + 'px';else container.style.height = mmax(scrollHeight, clientHeight) - footerHeight + 'px'; // clientHeight = _clientHeight()
      // clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)

      scrollMax = mmax(0, doc.scrollHeight - clientHeight); // console.log('scrollMax', {
      //     scrollHeight,
      //     doc_scrollHeight: doc.scrollHeight,
      //     clientHeight,
      //     scrollMax,
      // })
    }
  }

  function updateFrame() {
    itemCount = _itemCount();
    maxPosition = itemCount - 1;

    while (hs.length) {
      hsPush(hs.pop());
    }

    if (!itemCount) {
      hsFlush();
      if (!scrolling) vm.$emit('laidout', 0, hs);
      win.dispatchEvent(scrolledEvent = new Event('scroll'));
      return;
    }

    var h, up, down, i;

    if (!firstHeight) {
      h = hsPop(0);
      firstHeight = h.height;
      hsPush(h);
    }

    if (!lastHeight) {
      h = hsPop(maxPosition);
      lastHeight = h.height;
      hsPush(h);
    }

    maxOffset = clientHeight - lastHeight;
    scrollTop = doc.scrollTop;

    if (scrolling && !keyboard) {
      scrolled = Date.now();

      if (touched) {
        hs.push(h = hsPop(hsPosition = touchPosition));
        hsOffset = touchOffset - scrollTop + touchTop;
      } else {
        scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? scrollTop / scrollMax : 0));
        var positionReal = maxPosition * scrollRatio;
        hs.push(h = hsPop(hsPosition = mfloor(positionReal)));
        hsOffset = scrollRatio * maxOffset - positionReal % 1 * h.height;
      } // console.log('scrolling', {hsPosition, hsOffset, scrollTop, scrollMax, touching})

    } else if (posId) {
      hsPosition = posPosition;
      hsOffset = posOffset;
      hs.push(h = hsPop(hsPosition));
    } else {
      if (_stackFromBottom2) {
        if (_position2 > maxPosition) {
          hsPosition = maxPosition;
          hs.push(h = hsPop(hsPosition));
        } else {
          hsPosition = _position2 < 0 ? _stickToTop ? 0 : maxPosition : _position2;
          hs.push(h = hsPop(hsPosition));
          hsOffset = clientHeight - offset - h.height;
        }
      } else {
        if (_position2 > maxPosition) {
          hsPosition = maxPosition;
          hs.push(h = hsPop(hsPosition));
          hsOffset = maxOffset;
        } else {
          hsPosition = _position2 > -1 ? _position2 : 0;
          hs.push(h = hsPop(hsPosition));
          hsOffset = offset;
        }
      } // console.log({'-> hsPosition': hsPosition, hsOffset, position, offset, clientHeight})

    }

    up = hsOffset;
    down = up + h.height;
    i = hsPosition;

    while (i-- > 0 && up > 0) {
      hs.unshift(h = hsPop(i));
      up -= h.height;
    }

    i = hsPosition;
    if (hs.length > 1) hsPosition -= hs.length - 1;
    hsHeight = down - up;
    hsOffset = up;

    while (++i < itemCount && (down < clientHeight || hsHeight < clientHeightEx)) {
      hs.push(h = hsPop(i));
      down += h.height;
      hsHeight += h.height;
    }

    var bottomSpace = clientHeight - down; //if (!scrolling && !scrolled && bottomSpace > 0) {

    if (bottomSpace > 0) {
      i = hsPosition;

      while (i-- > 0 && up > -bottomSpace) {
        hs.unshift(h = hsPop(i));
        up -= h.height;
        hsHeight += h.height;
        hsPosition--;
      }

      hsOffset = up;
    }

    allShown = hs.length === itemCount && hsHeight < clientHeightEx + 1; //if (!scrolling && !scrolled) {

    if (!scrolling) {
      if (_stackFromBottom2) {
        if (bottomSpace > 0) {
          up += bottomSpace;
          hsOffset = up;
        } else if (!hsPosition && hsOffset > 0) {
          up -= mmin(-bottomSpace, hsOffset);
          hsOffset = up;
        }
      } else if (!hsPosition) {
        if (hsOffset >= 0) {
          up = 0;
          hsOffset = 0;
        } else if (bottomSpace > 0) {
          up += mmin(bottomSpace, -hsOffset);
          hsOffset = up;
        }
      }
    }

    var clearScrolled = true;

    if (!keyboard) {
      if (allShown) {
        if (!scrolling) {
          _scrollMax();

          if (!_stackFromBottom2 || _stickToTop) {
            if (Math.abs(scrollTop + hsOffset) >= 1) _scroll(scrollTop = -hsOffset);
          }
        } else {
          hsOffset = -mround(scrollMax * hsOffset / (clientHeight - hsHeight));
        }

        if (!_stackFromBottom2 || _stickToTop) {
          up = -scrollTop;
        }
      } else if (!scrolling) {
        var scrollClue = scrollTop < .5 ? -1 : scrollTop + .5 > scrollMax ? 1 : 0;

        _scrollMax(); // scrollRatio = scrollTop / scrollTopMax
        // positionReal = maxPosition * scrollRatio
        // hsPosition = mfloor(positionReal)
        //
        // offsetRatio = positionReal % 1
        // = maxPosition * scrollTop / scrollTopMax - hsPosition
        // 0 <= offsetRatio < 1
        //
        // hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height
        //
        // scrollTop = (hsOffset - hsPosition * h.height) / (maxOffset - maxPosition * h.height) * scrollTopMax


        var newScrollTop = scrollTop,
            hOffset = hsOffset,
            delta = Number.MAX_VALUE,
            offsetRatio = 1; //const stat = []

        for (var _i = 0; _i < hs.length; _i++) {
          var hh = hs[_i].height,
              _scrollTop = scrollMax * (hOffset - (hsPosition + _i) * hh) / (maxOffset - maxPosition * hh),
              _offsetRatio = maxPosition * _scrollTop / scrollMax - (hsPosition + _i);

          if (scrolled) {
            var _delta = mabs(scrollTop - _scrollTop); //stat.push({'#': hsPosition + i, _scrollTop, _offsetRatio, _delta})


            if (_offsetRatio > -NEAR_ZERO && _offsetRatio < 1 && _delta < delta) {
              delta = _delta;
              newScrollTop = _scrollTop; //break
            }
          } else {
            //stat.push({'#': hsPosition + i, _scrollTop, _offsetRatio})
            if (_offsetRatio > -NEAR_ZERO && _offsetRatio < offsetRatio) {
              offsetRatio = _offsetRatio;
              newScrollTop = _scrollTop; //break
            }
          }

          hOffset += hh;
        }

        var _scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? newScrollTop / scrollMax : 0)),
            _positionReal = maxPosition * _scrollRatio,
            _hsPosition = mfloor(_positionReal); // if (_hsPosition >= hsPosition && _hsPosition < hsPosition + hs.length) {
        //     const _h = hs[_hsPosition - hsPosition],
        //         _hsOffset = _scrollRatio * maxOffset - (_positionReal % 1) * _h.height
        //
        //     let a = ''
        //
        //     if (_hsPosition - 1 >= hsPosition)
        //         a += (_hsPosition - 1) + ' - ' + (_hsOffset - hs[_hsPosition - hsPosition - 1].height) + ', '
        //
        //     a += _hsPosition + ' - ' + _hsOffset + ', '
        //
        //     if (_hsPosition + 1 < hsPosition + hs.length)
        //         a += (_hsPosition + 1) + ' - ' + (_hsOffset + hs[_hsPosition - hsPosition].height) + ', '
        //
        //     console.log({hsPosition, hsOffset, a})
        // } else {
        //     console.log({hsPosition, _hsPosition, hsOffset})
        //
        // }
        //console.log(stat)


        if (scrolled && touched) {
          var scrollDelta = 0; //console.log({scrollClue, scrollTop, scrollMax})

          if (scrollClue < 0) {
            scrollDelta = !hsPosition ? hsOffset : -newScrollTop; //console.log({scrollDelta})

            _scroll(scrollTop = newScrollTop = 0);
          } else if (scrollClue > 0) {
            var hsOffsetOld = hsOffset; //hsOffset -= clientHeight - clientHeightOld

            scrollDelta = hsPosition + hs.length - 1 === maxPosition ? hsOffset - (clientHeight - hsHeight) : scrollMax - newScrollTop; //console.log({scrollDelta, delta: clientHeight - clientHeightOld, hsOffset, hsOffsetOld})

            _scroll(scrollTop = newScrollTop = scrollMax);
          }

          if (mabs(scrollDelta) >= 1) {
            clearScrolled = false;
            var r = mmax(0, mmin(1, (Date.now() - scrolled) / 2000)),
                _hsOffsetOld = hsOffset;
            hsOffset -= r * scrollDelta; //console.log({r, hsOffsetOld, hsOffset})

            update();
          } else {
            if (scrollClue < 0) {
              if (!hsPosition) {
                hsOffset = 0;
              }
            } else if (scrollClue > 0) {
              if (hsPosition + hs.length - 1 === maxPosition) {
                hsOffset = clientHeight - hsHeight;
              }
            }
          }
        }

        if (mabs(scrollTop - newScrollTop) >= 1) {
          //console.log('adjustScroll', {scrollTop, newScrollTop})
          _scroll(scrollTop = newScrollTop);
        }
      }
    }

    if (!scrolling) clientHeightOld = clientHeight; // console.log(keyboardAnchor.getBoundingClientRect().bottom, clientHeight)

    var scrollOffset = isFixed ? 0 : keyboard ? scrollTop + keyboardAnchor.getBoundingClientRect().bottom - clientHeight : scrollTop;
    down = up = hsOffset; //down = hsOffset + hsHeight

    var j = 0,
        fluidCheck = 0;

    while (j < hs.length) {
      if (down > clientHeight - footerHeight) {
        h = hs.pop();
        hsHeight -= h.height;
        hsPush(h);
        continue;
      }

      h = hs[j]; //h.style.zIndex = j
      //h.style.order = j

      if (h.maxHRatio) {
        var top = down,
            height = h.height - h.top;
        if (hsPosition + j === maxPosition) height -= footerHeight;

        if (!allShown) {
          if (j === 0 && down + h.top < 0) {
            top = down + mmin(height - h.minHeight, -down - h.top);
            height -= top - down;
          }

          if (j === hs.length - 1 && down + height > clientHeight) height = mmax(h.minHeight, windowHeight - headerHeight - footerHeight - down);
        }

        h.style.top = scrollOffset + top + h.top + 'px';
        h.style.height = height + 'px';
        fluidCheck = fluidCheck | 2;
      } else {
        h.style.top = scrollOffset + down + h.top + 'px';
        fluidCheck = fluidCheck | 1;
      }

      down += h.height;

      if (down < headerHeight) {
        hsPosition++;
        hsOffset += h.height;
        hsHeight -= h.height;
        hs.splice(j, 1);
        hsPush(h);
      } else {
        j++;
      }
    }

    if (scrolling && touched) {
      touchPosition = hsPosition;
      touchOffset = hsOffset;
      touchTop = scrollTop;
    }

    hsFlush();

    if (_stackFromBottom2) {
      _position2 = hsPosition + hs.length - 1;
      offset = clientHeight - hsHeight - hsOffset;

      if (fluidCheck === 3) {
        for (i = hs.length - 1; i >= 0; i--) {
          if (hs[i].maxHRatio) {
            _position2--;
            offset += hs[i].height;
          } else break;
        }
      } else if (fluidCheck === 2 && hs.length === itemCount) {
        _position2 = -1;
      }
    } else {
      _position2 = hsPosition;
      offset = hsOffset;

      if (fluidCheck === 3) {
        var _iterator8 = _createForOfIteratorHelper(hs),
            _step8;

        try {
          for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
            h = _step8.value;

            if (h.maxHRatio) {
              _position2++;
              offset += h.height;
            } else break;
          }
        } catch (err) {
          _iterator8.e(err);
        } finally {
          _iterator8.f();
        }
      } else if (fluidCheck === 2 && hs.length === itemCount) {
        _position2 = -1;
      }
    } // console.log({
    //     '<- hsPosition': hsPosition,
    //     hsOffset,
    //     position,
    //     offset,
    //     clientHeight,
    // })


    if (!scrolling && clearScrolled) {
      scrolled = 0;
      vm.$emit('laidout', hsPosition, hs);
    }

    if (scrolling) win.dispatchEvent(scrolledEvent = new Event('scroll'));
    vm.$emit('scrolled', hsPosition, hs);
  }

  var scrolled = 0,
      scrolling = false,
      scrolledEvent = null,
      scrollStarted = 0,
      scrollEndTimeout,
      touched = false,
      touching = false,
      touchTop,
      touchPosition,
      touchOffset,
      touchEnd = 0,
      keyboard = false,
      keyboardAnchor;

  var onResize = function onResize() {
    hsInvalidate(0, itemCount);
    clientHeight = _clientHeight();
    windowHeight = isWindow ? _windowHeight() : clientHeight;
    clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight);
    scrollMax = mmax(0, doc.scrollHeight - clientHeight);
    headerHeight = wrapper.offsetTop - doc.offsetTop;
    if (isFixed) container.style.width = wrapper.offsetWidth + 'px';else container.style.top = -headerHeight + 'px';

    var bodyHeight = _bodyHeight();

    footerHeight = bodyHeight - headerHeight - el.offsetHeight; // console.log('resize', {
    //     clientHeight,
    //     clientHeightEx,
    //     scrollMax,
    //     headerHeight,
    //     bodyHeight,
    //     elHeight: el.offsetHeight,
    //     footerHeight
    // })

    update();
  },
      onScroll = function onScroll(ev) {
    if (scrolledEvent === ev) {
      scrolledEvent = null;
      return;
    } // console.log('onScroll', {
    //     type: ev.type,
    //     timeStamp: ev.timeStamp,
    //     scrollTime,
    //     scrollStarted,
    //     scrollTop,
    //     scrollMax,
    // })


    ev.cancelBubble = true;
    if (ev.timeStamp > scrollTime + 99) onScrollContinue(ev);

    if (scrollStarted) {
      scrolling = true;
      update();
    }
  },
      onScrollContinue = function onScrollContinue(ev) {
    //console.log('onScrollContinue', ev?.type)
    if (!scrollStarted && (keyboard || touching || !touched)) scrollStarted = 1;

    if (scrollStarted > 0 && ev && (ev.type === 'mousedown' || ev.type === 'touchstart')) {
      scrollStarted = -1; //win.addEventListener('mousemove', onScrollContinue)

      addEventListener('mouseup', onScrollEnd);
      addEventListener('touchend', onScrollEnd);
    }

    if (scrollEndTimeout) clearTimeout(scrollEndTimeout);
    if (scrollStarted > 0) scrollEndTimeout = setTimeout(onScrollEnd, 500);
  },
      onScrollEnd = function onScrollEnd(ev) {
    //console.log('onScrollEnd', ev?.type)
    if (scrollStarted < 0) {
      removeEventListener('mouseup', onScrollEnd);
      removeEventListener('touchend', onScrollEnd); //win.removeEventListener('mousemove', onScrollContinue)
    }

    scrollStarted = 0;

    if (scrollEndTimeout) {
      clearTimeout(scrollEndTimeout);
      scrollEndTimeout = 0;
    }

    if (scrolling) {
      scrolling = false; //console.log('onScrollEnd', ev, scrollTop, scrollMax)

      update();
    }
  },
      onTouchStart = function onTouchStart(ev) {
    //console.log('onTouchStart', ev?.type, allShown)
    if (allShown) {
      onScrollContinue(ev);
      return;
    } //touchEnd = 0


    touchTop = doc.scrollTop;
    touchPosition = hsPosition;
    touchOffset = hsOffset;
    win.addEventListener('touchend', onTouchEnd);
    touched = true;
    touching = true;
  },
      onTouchEnd = function onTouchEnd(ev) {
    //console.log('onTouchEnd', ev?.type)
    win.removeEventListener('touchend', onTouchEnd); // const scrollTop = doc.scrollTop
    // if (scrollTop < 0) {
    //     touchEnd = scrollTop
    // } else if (scrollTop > scrollMax) {
    //     touchEnd = scrollTop - scrollMax
    // } else {
    //     touchEnd = 0
    // }
    //console.log('onTouchEnd', {touchEnd, scrollTop, scrollMax})

    if (touching) {
      touching = false;
      update();
    }
  },
      onKeyboardFocus = function onKeyboardFocus(ev) {
    var _document$activeEleme, _document$activeEleme2;

    console.log('onKeyboardFocus', ev.target.nodeName, (_document$activeEleme = document.activeElement) === null || _document$activeEleme === void 0 ? void 0 : _document$activeEleme.nodeName); // , {
    //     position,
    //     offset,
    //     hsPosition,
    //     hsOffset,
    // }, keyboardAnchor, keyboardAnchor.getBoundingClientRect())

    keyboard = ev.target.nodeName === ((_document$activeEleme2 = document.activeElement) === null || _document$activeEleme2 === void 0 ? void 0 : _document$activeEleme2.nodeName); //doc.style.position = keyboard ? 'fixed' : ''

    update();
  },
      onKeyboardFocusOut = function onKeyboardFocusOut(ev) {
    var _document$activeEleme3, _document$activeEleme4;

    console.log('onKeyboardFocusOut', ev.target.nodeName, (_document$activeEleme3 = document.activeElement) === null || _document$activeEleme3 === void 0 ? void 0 : _document$activeEleme3.nodeName);

    if (['TEXTAREA', 'INPUT'].indexOf(ev.target.nodeName) < 0 && ['TEXTAREA', 'INPUT'].indexOf((_document$activeEleme4 = document.activeElement) === null || _document$activeEleme4 === void 0 ? void 0 : _document$activeEleme4.nodeName) < 0) {
      keyboard = false; //doc.style.position = keyboard ? 'fixed' : ''

      update();
    }
  },
      onKeyboardBlur = function onKeyboardBlur(ev) {
    var _document$activeEleme5;

    console.log('onKeyboardBlur', ev.target.nodeName, (_document$activeEleme5 = document.activeElement) === null || _document$activeEleme5 === void 0 ? void 0 : _document$activeEleme5.nodeName);
    keyboard = false; //doc.style.position = keyboard ? 'fixed' : ''

    update();
  },
      onKeyboardTouch = function onKeyboardTouch(ev) {
    var _document$activeEleme6;

    var _keyboard = ['TEXTAREA', 'INPUT'].indexOf(ev.target.nodeName) > -1 || ['TEXTAREA', 'INPUT'].indexOf((_document$activeEleme6 = document.activeElement) === null || _document$activeEleme6 === void 0 ? void 0 : _document$activeEleme6.nodeName) > -1;

    if (keyboard !== _keyboard) {
      var _document$activeEleme7;

      console.log('onKeyboardTouch', ev.target.nodeName, (_document$activeEleme7 = document.activeElement) === null || _document$activeEleme7 === void 0 ? void 0 : _document$activeEleme7.nodeName);
      keyboard = _keyboard; //doc.style.position = keyboard ? 'fixed' : ''

      update();
    }
  };

  function created() {
    _source = this.source;
    _itemCount = _source.itemCount;
    _getItem = _source.getItem;
    _stackFromBottom2 = this.stackFromBottom;
    _stickToTop = this.stickToTop;
    itemCount = _itemCount();
    maxPosition = itemCount - 1;
  }

  function mounted() {
    var _el$closest;

    var Vue = this.$root.__proto__.constructor;
    el = this.$el;
    win = (_el$closest = el.closest('.recycler-window')) !== null && _el$closest !== void 0 ? _el$closest : window;
    isWindow = win === window;
    isFixed = false; //isWindow

    doc = isWindow ? document.documentElement : win;
    _clientHeight = isWindow ? function () {
      return win.innerHeight;
    } : function () {
      return doc.clientHeight;
    };
    wrapper = el.children[0];
    container = wrapper.children[0];

    if (isFixed) {
      container.style.position = 'fixed';
      container.style.top = 0; //container.style.left = 0
      //container.style.right = 0

      container.style.bottom = 0;
    }

    addEventListener('resize', onResize);
    win.addEventListener('scroll', onScroll, true);
    win.addEventListener('wheel', onScrollContinue, true);
    win.addEventListener('mousedown', onScrollContinue, true);
    win.addEventListener('touchstart', onTouchStart, true);

    if ((0, _is_iOS["default"])()) {
      addEventListener('focus', onKeyboardFocus, true);
      addEventListener('blur', onKeyboardBlur, true);
      addEventListener('touchstart', onKeyboardTouch, true);
      addEventListener('focusout', onKeyboardFocusOut, true);
      keyboardAnchor = document.createElement('div');
      keyboardAnchor.style.position = 'fixed';
      keyboardAnchor.style.bottom = 0;
      keyboardAnchor.style.height = '1px';
      document.body.append(keyboardAnchor);
    }

    onResize();
    clientHeightOld = clientHeight; //onScrollContinue()
    //win.dispatchEvent(new Event('scroll'))

    win.recycler = this;

    loop: for (var type in vm.$slots) {
      var _iterator9 = _createForOfIteratorHelper(vm.$slots[type]),
          _step9;

      try {
        for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
          var vnode = _step9.value;
          if (!vnode || !vnode.tag) continue;

          (function (_type, vnode) {
            var Ctor = vnode.componentOptions ? vnode.componentOptions.Ctor : Vue.extend({
              render: function render(h) {
                return vm.$slots[_type];
              }
            }),
                oldOptions = Ctor.options,
                options = Object.assign({}, oldOptions),
                dataFn = options.data;

            options.data = function () {
              var data = dataFn ? dataFn.call(this) : {};
              data.position = -1;
              return data;
            };

            options.computed = (0, _defaults["default"])({
              type: function type() {
                return _type;
              },
              source: function source() {
                return _source;
              },
              item: function item() {
                return _getItem(this.position);
              }
            }, oldOptions.computed);
            delete options.computed.position;

            if (vnode.componentOptions) {
              slots[_type] = function () {
                Ctor.options = options;
                var o = new Ctor({
                  _isComponent: true,
                  _parentVnode: vnode,
                  parent: vm
                });
                Ctor.options = oldOptions;
                return o;
              };
            } else {
              slots[_type] = function () {
                Ctor.options = options;
                var o = new Ctor({
                  // _isComponent: true,
                  // _parentVnode: vnode,
                  parent: vm
                });
                Ctor.options = oldOptions;
                return o;
              };
            }
          })(type, vnode);

          continue loop;
        }
      } catch (err) {
        _iterator9.e(err);
      } finally {
        _iterator9.f();
      }
    }

    emptySlot = function emptySlot() {
      return new Vue({
        render: function render(h) {
          return h('div');
        }
      });
    }; //console.log(slots, emptySlot)


    _source.attach(vm);
  }

  function beforeDestroy() {
    _source.detach(vm);

    if (win.recycler === this) delete win.recycler;
    removeEventListener('resize', onResize);
    win.removeEventListener('scroll', onScroll, true);
    win.removeEventListener('wheel', onScrollContinue, true);
    win.removeEventListener('mousedown', onScrollContinue, true);
    win.removeEventListener('mousemove', onScrollContinue, true);
    removeEventListener('focus', onKeyboardFocus, true);
    removeEventListener('blur', onKeyboardBlur, true);
    removeEventListener('touchstart', onKeyboardTouch, true);
    removeEventListener('focusout', onKeyboardFocusOut, true);
    if (keyboardAnchor) keyboardAnchor.remove();

    if (keyboard) {
      keyboard = false; //doc.style.position = keyboard ? 'fixed' : ''
    }

    scrolling = false;
    onScrollEnd();
    win.removeEventListener('touchstart', onTouchStart, true);
    win.removeEventListener('touchend', onTouchEnd, true);
    touched = false;
    touching = false;
    onTouchEnd();
    updateCancel(); // for (const h of hs) hsPush(h)
    // hs.length = 0
    // hsBinded.length = 0
    //
    // for (const key in hsCache) delete hsCache[key]
    //

    hsCleanUp();
    firstHeight = 0;
    lastHeight = 0;
    scrollHeight = 0;
  }

  (0, _mergeWith["default"])(this.$options, {
    created: created,
    mounted: mounted,
    beforeDestroy: beforeDestroy
  }, function (objValue, srcValue) {
    return Array.isArray(objValue) ? objValue.concat([srcValue]) : objValue ? undefined : [srcValue];
  });
  this.$options.watch = (0, _defaults["default"])({
    source: function source(newValue) {
      if (_source !== newValue) {
        _source.detach(vm);

        _source = newValue;

        _source.attach(vm);

        _itemCount = _source.itemCount;
        _getItem = _source.getItem;
        this.onDatasetChanged();
        hsCleanUp();
      }
    },
    stackFromBottom: function stackFromBottom(newValue) {
      _stackFromBottom2 = newValue;
      this.onDatasetChanged();
    },
    stickToTop: function stickToTop(newValue) {
      _stickToTop = newValue;
      this.onDatasetChanged();
    }
  }, this.$options.watch);
  this.$options.methods = (0, _defaults["default"])({
    onDatasetChanged: function onDatasetChanged() {
      //console.log('update', {hsPosition, position, _position, count})
      if (hsInvalidate(0, _itemCount())) update();
    },
    onUpdate: function onUpdate(_position, count) {
      //console.log('update', {hsPosition, position, _position, count})
      if (hsInvalidate(_position, count)) update();
    },
    onInsert: function onInsert(_position, count) {
      // console.log('insert', {
      //     hsPosition,
      //     position,
      //     offset,
      //     _position,
      //     count,
      //     stackFromBottom,
      //     item: _getItem(_position)
      // })
      if (_position2 === -1) {
        if (_stackFromBottom2) {
          _position2 = maxPosition + count;
          offset = 0;
        } else {
          _position2 = 0;
          offset = 0;
        }
      } else if (_stackFromBottom2 && _position >= maxPosition && _position2 === maxPosition && -offset < (footerHeight + lastHeight) / 2) {
        _position2 = maxPosition + count;
        offset = 0;
      } else {
        if (_position < _position2) _position2 += count;
      }

      if (touched && _position < touchPosition) touchPosition += count;
      if (posId && _position < posPosition) posPosition += count;

      for (var i = mmax(0, _position - hsPosition); i < hs.length; i++) {
        hs[i].position += count;
      }

      if (hsInvalidate(_position, count)) update(); // console.log('inserted', {hsPosition, position, offset, item: _getItem(_position)})
    },
    onRemove: function onRemove(_position, count) {
      //console.log('remove', {hsPosition, position, _position, count, offset, stackFromBottom})
      var invalid = hsInvalidate(_position, count);
      if (!_itemCount()) _position2 = -1;else {
        if (_position < _position2) _position2 -= mmin(count, _position2 - _position + 1);
        if (touched && _position <= touchPosition) touchPosition -= mmin(count, touchPosition - _position + 1);
        if (posId && _position <= posPosition) posPosition -= mmin(count, posPosition - _position + 1);
      }

      if (invalid) {
        for (var i = mmax(0, _position + count - hsPosition); i < hs.length; i++) {
          hs[i].position -= count;
        } // for (let i = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); i < len; i++) {
        //     const [h] = hs.splice(i, 1)
        //     len--
        //     i--
        //
        //     //hsHeight -= h.height
        //     h.height = 0
        //     hsPush(h)
        //     //h.$el.remove()
        // }


        update();
      } //console.log('removed', {hsPosition, position, _position, count, offset, stackFromBottom})

    },
    update: update,
    updateNow: updateNow,
    setStackFromBottom: function setStackFromBottom(_stackFromBottom) {
      if (_stackFromBottom2 !== _stackFromBottom) {
        updateNow();
        _stackFromBottom2 = _stackFromBottom;
        var allFluid = true;

        if (_stackFromBottom2) {
          _position2 = hsPosition + hs.length - 1;
          offset = clientHeight - hsHeight - hsOffset;

          for (var i = hs.length - 1; i >= 0; i--) {
            if (hs[i].maxHRatio) {
              _position2--;
              offset += hs[i].height;
            } else {
              allFluid = false;
              break;
            }
          }
        } else {
          _position2 = hsPosition;
          offset = hsOffset;

          var _iterator10 = _createForOfIteratorHelper(hs),
              _step10;

          try {
            for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
              var h = _step10.value;

              if (h.maxHRatio) {
                _position2++;
                offset += h.height;
              } else {
                allFluid = false;
                break;
              }
            }
          } catch (err) {
            _iterator10.e(err);
          } finally {
            _iterator10.f();
          }
        }

        if (allFluid && hs.length === itemCount) {
          _position2 = -1;
        }
      }
    },
    position: function position(_position) {
      var _offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      if (_position === undefined) return [_position2, _stackFromBottom2 ? _position2 !== maxPosition ? offset - footerHeight : offset : _position2 ? offset - headerHeight : offset];
      _position2 = _position < 0 ? itemCount + _position : _position !== null && _position !== void 0 ? _position : 0;
      offset = _stackFromBottom2 ? _position2 !== maxPosition ? _offset + footerHeight : _offset : _position2 ? _offset + headerHeight : _offset;
      console.log('position', {
        position: _position2,
        offset: offset
      });
      update();
    },
    positionFromTop: function positionFromTop(_position, _offset) {
      if (_stackFromBottom2) {
        vm.setStackFromBottom(false);
        vm.position(_position, _offset);
        vm.setStackFromBottom(true);
      } else {
        vm.position(_position, _offset);
      }
    },
    positionSmooth: function positionSmooth(positionFn) {
      var _offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var _stackFromBottom = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _stackFromBottom2;

      if (posId) cancelAnimationFrame(posId);
      if (posResolve) posResolve();
      var prevPosition, prevOffset;
      return new Promise(function (resolve) {
        posResolve = resolve;

        var next = function next() {
          posId = null;

          if (scrolling || prevPosition === hsPosition && mabs(prevOffset - hsOffset) < 2) {
            posResolve = null;
            resolve();
            return;
          }

          prevPosition = hsPosition;
          prevOffset = hsOffset;
          posPosition = hsPosition;
          posOffset = hsOffset;

          var positionDelta = 48,
              //positionDelta = (clientHeight - headerHeight - footerHeight) / 8,
          _position = (0, _isFunction["default"])(positionFn) ? positionFn() : positionFn;

          if (_position < 0 && (0, _isFunction["default"])(positionFn)) {
            posResolve = null;
            resolve();
            return;
          }

          if (_position >= hsPosition && _position < hsPosition + hs.length) {
            var _offset2 = _offset;

            if (_stackFromBottom) {
              var h = hs[_position - hsPosition];
              _offset2 = clientHeight - (_position !== maxPosition ? _offset + footerHeight : _offset) - h.height;
            } else {
              _offset2 = _position ? _offset + headerHeight : _offset;
            }

            var hOffset = hsOffset;

            for (var i = 0; i < _position - hsPosition; i++) {
              hOffset += hs[i].height;
            }

            var delta = _offset2 - hOffset;

            if (mabs(delta) < 2) {
              posResolve = null;
              resolve();
              return;
            }

            posOffset = hsOffset + mmin(mabs(delta), positionDelta) * (delta < 0 ? -1 : 1);
          } else {
            if (_position < hsPosition) {
              posOffset = hsOffset + positionDelta;
            } else {
              posPosition = hsPosition + hs.length - 1;
              posOffset = hsOffset + hsHeight - hs[hs.length - 1].height - positionDelta;
            }
          }

          update();
          posId = requestAnimationFrame(next);
        };

        next();
      });
    },
    startPosition: function startPosition() {
      return hsPosition;
    },
    startOffset: function startOffset() {
      return hsOffset;
    },
    startPart: function startPart() {
      return hs.length ? hsOffset + hs[0].height - footerHeight : 0;
    },
    endPosition: function endPosition() {
      return hsPosition + hs.length - 1;
    },
    // positionReal = maxPosition * scrollRatio = 1
    // maxPosition * scrollTop / scrollTopMax = 1
    // scrollTop = scrollTopMax / maxPosition
    scrollTop: function scrollTop(top) {
      if (top !== undefined) {
        _position2 = 0;
        offset = _stackFromBottom2 ? clientHeight + top - firstHeight : -top; //console.log('scrollTop ->', {position, top, hsOffset})

        update();
        return;
      }

      var _scrollTop = (scrolling || scrolled) && touched ? doc.scrollTop : hsPosition ? firstHeight + (doc.scrollTop - scrollMax / maxPosition) / (scrollMax - scrollMax / maxPosition) * (scrollMax - firstHeight) : -hsOffset; //console.log('scrollTop <-', {scrolling, scrolled, _scrollTop})


      return _scrollTop;
    }
  }, this.$options.methods);
}

var _default = {
  props: {
    source: {
      type: Object,
      required: true
    },
    stackFromBottom: Boolean,
    stickToTop: Boolean
  },
  // watch: {
  //     source(newValue, value) {
  //         console.log(newValue, value)
  //     }
  // },
  render: function render(h) {
    return h('div', {
      attrs: {
        "class": 'recycler'
      }
    }, [h('div', {
      attrs: {
        style: 'position:relative;'
      }
    }, [h('div', {
      attrs: {
        "class": 'recycler-items',
        style: 'position:relative;overflow:hidden;'
      }
    })])]);
  },
  beforeCreate: beforeCreate
};
exports["default"] = _default;