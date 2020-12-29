"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _lodashEs = require("lodash-es");

var _utils = require("@rucebee/utils");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

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
  var el, win, doc, isWindow, isFixed, wrapper, container, _source, _itemCount, _getItem, _stackFromBottom, _stickToTop, emptySlot;

  var vm = this,
      slots = {},
      hs = [],
      hsBinded = [],
      hsCache = {},
      timeStamp = Date.now() <= new Event('check').timeStamp ? Date.now : performance.now.bind(performance),
      _scroll = function _scroll(top) {
    win.scrollTo(doc.scrollLeft, top);
    scrollTime = timeStamp(); //console.log('_scroll', top, scrollTime)
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
      scrollTime = 0;

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
      var index = (0, _lodashEs.findIndex)(hsTypeCache, ['id', item.id]);
      if (index < 0) index = (0, _lodashEs.findIndex)(hsTypeCache, ['id', undefined]);

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
      h.$mount(); //h.$emit = (...args) => vm.$emit.apply(vm, args)

      h._watcher.active = false;
      h.position = -1;
      h.position = position;
      h.style = h.$el.style;
      var style = h.style;
      style.position = 'absolute';
      style.left = 0;
      style.right = 0;
      style.marginTop = 0;
      style.marginBottom = 0;
      container.append(h.$el);
      var computedStyle = h.$el.currentStyle || getComputedStyle(h.$el);

      if (computedStyle.maxHeight.endsWith('%')) {
        h.maxHeight = (parseInt(computedStyle.maxHeight) || 0) / 100;
        h.minHeight = parseInt(computedStyle.minHeight) || h.$el.offsetHeight;
        style.maxHeight = 'initial';
        style.minHeight = 'initial';
      } //console.log('create', position)

    } else {
      if (!h.$el.parentElement) container.append(h.$el); //h.style.display = ''

      h.position = -1;
      h.position = position;

      h._update(h._render(), false); //console.log('bind', position, h.source)

    }

    h.id = item === null || item === void 0 ? void 0 : item.id;
    h.top = 0;
    if (!position) h.top += headerHeight;

    if (h.maxHeight > 0) {
      h.height = mmax(h.minHeight, h.maxHeight * clientHeight) + h.top + (position === maxPosition ? footerHeight : 0); //Doing it later:
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

      var _iterator = _createForOfIteratorHelper(hsTypeCache),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var _h = _step.value;
          if (_h.$el.parentElement) _h.$el.remove();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }

  function hsInvalidate(_position, count) {
    if (hsPosition >= itemCount) {
      if (_position <= 1) firstHeight = 0;
      lastHeight = 0;

      var _iterator2 = _createForOfIteratorHelper(hs),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var h = _step2.value;
          h.height = 0;
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
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

  function _scrollMax() {
    var fluidCount = 0,
        fluidHeight = 0;

    var _iterator3 = _createForOfIteratorHelper(hs),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var h = _step3.value;

        if (h.maxHeight) {
          fluidCount++;
          fluidHeight += h.height;
        }
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    var height = mround(mmin(9 * clientHeight, itemCount === fluidCount ? fluidHeight : hs.length > fluidCount ? (hsHeight - fluidHeight) * itemCount / (hs.length - fluidCount) + fluidHeight : 2 * clientHeight)); //console.log({height, scrollHeight, clientHeight})

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

      if (touching) {
        hs.push(h = hsPop(hsPosition = touchPosition));
        hsOffset = touchOffset - scrollTop + touchTop;
      } else {
        scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? scrollTop / scrollMax : 0));
        var positionReal = maxPosition * scrollRatio;
        hs.push(h = hsPop(hsPosition = mfloor(positionReal)));
        hsOffset = scrollRatio * maxOffset - positionReal % 1 * h.height;
      } //console.log('scrolling', {hsPosition, hsOffset, scrollTop, scrollMax})

    } else {
      if (_stackFromBottom) {
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
      } //console.log('->', {hsPosition, hsOffset, position, offset})

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
      if (_stackFromBottom) {
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

          if (!_stackFromBottom || _stickToTop) {
            if (Math.abs(scrollTop + hsOffset) >= 1) _scroll(scrollTop = -hsOffset);
          }
        } else {
          hsOffset = -mround(scrollMax * hsOffset / (clientHeight - hsHeight));
        }

        if (!_stackFromBottom || _stickToTop) {
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
        } //console.log(stat)


        if (scrolled && touching) {
          var scrollDelta = 0; //console.log({scrollClue, scrollTop, scrollMax,})

          if (scrollClue < 0) {
            scrollDelta = !hsPosition ? hsOffset : -newScrollTop; //console.log({scrollDelta,})

            _scroll(scrollTop = newScrollTop = 0);
          } else if (scrollClue > 0) {
            var hsOffsetOld = hsOffset;
            hsOffset -= clientHeight - clientHeightOld;
            scrollDelta = hsPosition + hs.length - 1 === maxPosition ? hsOffset - (clientHeight - hsHeight) : scrollMax - newScrollTop; //console.log({scrollDelta, delta: clientHeight - clientHeightOld, hsOffset, hsOffsetOld,})

            _scroll(scrollTop = newScrollTop = scrollMax);
          }

          if (mabs(scrollDelta) >= 1) {
            clearScrolled = false;
            var r = mmax(0, mmin(1, (Date.now() - scrolled) / 2000)),
                _hsOffsetOld = hsOffset;
            hsOffset -= r * scrollDelta;
            console.log({
              r: r,
              hsOffsetOld: _hsOffsetOld,
              hsOffset: hsOffset
            });
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
    down = up;
    var j = 0,
        fluidCheck = 0;

    while (j < hs.length) {
      if (down > clientHeight) {
        hsPush(hs.pop());
        continue;
      }

      h = hs[j]; //h.style.zIndex = j
      //h.style.order = j

      if (h.maxHeight) {
        var top = down,
            height = h.height - h.top;
        if (hsPosition + j === maxPosition) height -= footerHeight;

        if (!allShown) {
          if (j === 0 && down + h.top < 0) {
            top = down + mmin(height - h.minHeight, -down - h.top);
            height -= top - down;
          }

          if (j === hs.length - 1 && down + height > clientHeight) height = mmax(h.minHeight, clientHeight - down);
        }

        h.style.top = scrollOffset + top + h.top + 'px';
        h.style.height = height + 'px';
        fluidCheck = fluidCheck | 2;
      } else {
        h.style.top = scrollOffset + down + h.top + 'px';
        fluidCheck = fluidCheck | 1;
      }

      down += h.height;

      if (down < 0) {
        hsPosition++;
        hsOffset += h.height;
        hs.splice(j, 1);
        hsPush(h);
      } else {
        j++;
      }
    }

    if (scrolling && touching) {
      touchPosition = hsPosition;
      touchOffset = hsOffset;
      touchTop = scrollTop;
    }

    hsFlush();

    if (_stackFromBottom) {
      // position = maxPosition - hsPosition - hs.length + 1
      _position2 = hsPosition + hs.length - 1;
      offset = clientHeight - hsHeight - hsOffset;

      if (fluidCheck === 3) {
        for (i = hs.length - 1; i >= 0; i--) {
          if (hs[i].maxHeight) {
            _position2--;
            offset += hs[i].height;
          } else break;
        }
      } else if (fluidCheck === 2) {
        _position2 = -1;
      }
    } else {
      _position2 = hsPosition;
      offset = hsOffset;

      if (fluidCheck === 3) {
        var _iterator4 = _createForOfIteratorHelper(hs),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            h = _step4.value;

            if (h.maxHeight) {
              _position2++;
              offset += h.height;
            } else break;
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }
      } else if (fluidCheck === 2) {
        _position2 = -1;
      }
    } //console.log('<-', {hsPosition, hsOffset, position, offset, maxPosition})


    if (!scrolling && clearScrolled) {
      scrolled = 0;
      vm.$emit('laidout', hsPosition, hs);
    }

    win.dispatchEvent(scrolledEvent = new Event('scroll'));
  }

  var scrolled = 0,
      scrolling = false,
      scrolledEvent = null,
      scrollStarted = 0,
      scrollEndTimeout,
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
    } // console.log('onScroll', ev.type, ev.timeStamp, {
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
    if (!scrollStarted) scrollStarted = 1;

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
      scrolling = false; //touching = false
      //console.log('onScrollEnd', ev, scrollTop, scrollMax)

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
    win.addEventListener('touchend', onTouchEnd); // just detect touching

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
    // if (touching) {
    //     touching = false
    //
    //     update()
    // }
  },
      onKeyboardFocus = function onKeyboardFocus(ev) {
    var _document$activeEleme, _document$activeEleme2;

    console.log('onKeyboardFocus', ev.target.nodeName, (_document$activeEleme = document.activeElement) === null || _document$activeEleme === void 0 ? void 0 : _document$activeEleme.nodeName); // , {
    //     position,
    //     offset,
    //     hsPosition,
    //     hsOffset,
    // }, keyboardAnchor, keyboardAnchor.getBoundingClientRect())

    keyboard = ev.target.nodeName === ((_document$activeEleme2 = document.activeElement) === null || _document$activeEleme2 === void 0 ? void 0 : _document$activeEleme2.nodeName);
    update();
  },
      onKeyboardFocusOut = function onKeyboardFocusOut(ev) {
    var _document$activeEleme3;

    console.log('onKeyboardFocusOut', ev.target.nodeName, (_document$activeEleme3 = document.activeElement) === null || _document$activeEleme3 === void 0 ? void 0 : _document$activeEleme3.nodeName);
    keyboard = false;
    update();
  },
      onKeyboardBlur = function onKeyboardBlur(ev) {
    var _document$activeEleme4;

    console.log('onKeyboardBlur', ev.target.nodeName, (_document$activeEleme4 = document.activeElement) === null || _document$activeEleme4 === void 0 ? void 0 : _document$activeEleme4.nodeName);
    keyboard = false;
    update();
  },
      onKeyboardTouch = function onKeyboardTouch(ev) {
    var _keyboard = ['TEXTAREA', 'INPUT'].indexOf(ev.target.nodeName) > -1;

    if (keyboard !== _keyboard) {
      var _document$activeEleme5;

      console.log('onKeyboardTouch', ev.target.nodeName, (_document$activeEleme5 = document.activeElement) === null || _document$activeEleme5 === void 0 ? void 0 : _document$activeEleme5.nodeName);
      keyboard = _keyboard;
      update();
    }
  };

  function created() {
    _source = this.source;
    _itemCount = _source.itemCount;
    _getItem = _source.getItem;
    _stackFromBottom = this.stackFromBottom;
    _stickToTop = this.stickToTop;
    itemCount = _itemCount();
    maxPosition = itemCount - 1;
  }

  function mounted() {
    var _el$closest;

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

    if ((0, _utils.is_iOS)()) {
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
      var _iterator5 = _createForOfIteratorHelper(vm.$slots[type]),
          _step5;

      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var vnode = _step5.value;
          if (!vnode || !vnode.componentOptions) continue;

          (function (_type, vnode) {
            var Ctor = vnode.componentOptions.Ctor,
                oldOptions = Ctor.options,
                options = Object.assign({}, oldOptions),
                dataFn = options.data;

            options.data = function () {
              var data = dataFn ? dataFn.call(this) : {};
              data.position = -1;
              return data;
            };

            options.computed = (0, _lodashEs.defaults)({
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
          })(type, vnode);

          continue loop;
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
    }

    var Vue = this.$root.__proto__.constructor;

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
    scrolling = false;
    onScrollEnd();
    win.removeEventListener('touchstart', onTouchStart, true);
    win.removeEventListener('touchend', onTouchEnd, true);
    touching = false;
    onTouchEnd();
    updateCancel();

    var _iterator6 = _createForOfIteratorHelper(hs),
        _step6;

    try {
      for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
        var h = _step6.value;
        hsPush(h);
      }
    } catch (err) {
      _iterator6.e(err);
    } finally {
      _iterator6.f();
    }

    hs.length = 0;
    hsBinded.length = 0;

    for (var key in hsCache) {
      delete hsCache[key];
    }

    firstHeight = 0;
    lastHeight = 0;
    scrollHeight = 0;
  }

  (0, _lodashEs.mergeWith)(this.$options, {
    created: created,
    mounted: mounted,
    beforeDestroy: beforeDestroy
  }, function (objValue, srcValue) {
    return Array.isArray(objValue) ? objValue.concat([srcValue]) : objValue ? undefined : [srcValue];
  });
  this.$options.watch = (0, _lodashEs.defaults)({
    source: function source(newValue) {
      _source = newValue;
      _itemCount = _source.itemCount;
      _getItem = _source.getItem;
      this.onDatasetChanged();
    },
    stackFromBottom: function stackFromBottom(newValue) {
      _stackFromBottom = newValue;
      this.onDatasetChanged();
    },
    stickToTop: function stickToTop(newValue) {
      _stickToTop = newValue;
      this.onDatasetChanged();
    }
  }, this.$options.watch);
  this.$options.methods = (0, _lodashEs.defaults)({
    onDatasetChanged: function onDatasetChanged() {
      //console.log('update', {hsPosition, position, _position, count})
      if (hsInvalidate(0, _itemCount())) update();
    },
    onUpdate: function onUpdate(_position, count) {
      //console.log('update', {hsPosition, position, _position, count})
      if (hsInvalidate(_position, count)) update();
    },
    onInsert: function onInsert(_position, count) {
      console.log('insert', {
        hsPosition: hsPosition,
        position: _position2,
        _position: _position,
        count: count
      });

      if (_position2 === -1) {
        if (_stackFromBottom && !_stickToTop) {
          _position2 = maxPosition + count - 1;
          offset = footerHeight;
        } else {
          _position2 = 0;
          offset = 0;
        }
      } else if (_stackFromBottom && _position >= maxPosition && _position2 === maxPosition && offset > footerHeight - lastHeight / 2) {
        _position2 = maxPosition + count - 1;
        offset = footerHeight;
      } else {
        if (_position <= _position2) _position2 += count;
      }

      if (touching && _position <= touchPosition) touchPosition += count;

      for (var i = mmax(0, _position - hsPosition); i < hs.length; i++) {
        hs[i].position += count;
      }

      if (hsInvalidate(_position, count)) update();
    },
    onRemove: function onRemove(_position, count) {
      console.log('remove', {
        hsPosition: hsPosition,
        position: _position2,
        _position: _position,
        count: count
      });
      var invalid = hsInvalidate(_position, count);
      if (!_itemCount()) _position2 = -1;else {
        if (_position < _position2) _position2 -= mmin(count, _position2 - _position + 1);
        if (touching && _position <= touchPosition) touchPosition -= mmin(count, touchPosition - _position + 1);
      }

      if (invalid) {
        for (var i = mmax(0, _position + count - hsPosition); i < hs.length; i++) {
          hs[i].position -= count;
        }

        for (var _i2 = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); _i2 < len; _i2++) {
          var _hs$splice = hs.splice(_i2, 1),
              _hs$splice2 = _slicedToArray(_hs$splice, 1),
              h = _hs$splice2[0];

          len--;
          _i2--;
          h.height = 0;
          hsPush(h); //h.$el.remove()
        }

        update();
      }
    },
    update: update,
    updateNow: updateNow,
    position: function position(_position, _offset) {
      if (_position === undefined && _offset === undefined) return [_position2 < 0 ? undefined : _position2, offset];
      _position2 = _position < 0 ? itemCount + _position : _position !== null && _position !== void 0 ? _position : 0;
      offset = _stackFromBottom ? _offset === undefined ? _position2 !== maxPosition ? footerHeight : 0 : _offset //? _offset || 0
      : _offset === undefined ? _position2 ? headerHeight : 0 : _offset; //console.log('position', {position, offset})

      update();
    },
    startPosition: function startPosition() {
      return hsPosition;
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
        offset = _stackFromBottom ? clientHeight + top - firstHeight : -top; //console.log('scrollTop ->', {position, top, hsOffset})

        update();
        return;
      }

      var _scrollTop = (scrolling || scrolled) && touching ? doc.scrollTop : hsPosition ? firstHeight + (doc.scrollTop - scrollMax / maxPosition) / (scrollMax - scrollMax / maxPosition) * (scrollMax - firstHeight) : -hsOffset; //console.log('scrollTop <-', {scrolling, scrolled, _scrollTop})


      return _scrollTop;
    },
    offset: function offset(position) {
      var h = hs[position - hsPosition];
      if (!h) return; //console.log({t: parseFloat(h.style.top), hsOffset, clientHeight, h: h.height, footerHeight})

      return _stackFromBottom ? clientHeight - parseFloat(h.style.top) - h.height : parseFloat(h.style.top);
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