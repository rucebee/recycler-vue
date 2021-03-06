import defaults from 'lodash/defaults'
import mergeWith from 'lodash/mergeWith'
import findIndex from 'lodash/findIndex'
import isFunction from 'lodash/isFunction'
import noop from 'lodash/noop'

import animate from '@rucebee/utils/src/animate'
import is_iOS from '@rucebee/utils/src/is_iOS'

const mmin = Math.min,
    mmax = Math.max,
    mfloor = Math.floor,
    mround = Math.round,
    mabs = Math.abs,
    NEAR_ZERO = .0001,
    NEAR_ONE = 1 - NEAR_ZERO

function beforeCreate() {
    let el, win, doc,
        isWindow, isFixed,
        wrapper, container,

        source,
        _itemCount,
        _getItem,
        stackFromBottom,
        stickToTop,
        emptySlot,
        hsCache = {}

    const vm = this,
        slots = {},

        hs = [],
        hsBinded = [],

        timeStamp = Date.now() <= new Event('check').timeStamp ? Date.now : performance.now.bind(performance),

        _scroll = top => {
            win.scrollTo(doc.scrollLeft, top)
            scrollTime = timeStamp()
            //console.log('_scroll', top, scrollTime)
        },

        _windowHeight = () => {
            const EMPTY_DIV = document.createElement('div')
            EMPTY_DIV.style.height = '100vh'
            EMPTY_DIV.style.width = 0
            EMPTY_DIV.style.position = 'absolute'

            document.body.append(EMPTY_DIV)

            const height = EMPTY_DIV.clientHeight

            EMPTY_DIV.remove()

            return height
        },

        _bodyHeight = () => {
            const EMPTY_DIV = document.createElement('div'),
                ADD_1PX = el.offsetHeight ? 0 : 1

            EMPTY_DIV.style.height = '1px'
            if (ADD_1PX) el.style.minHeight = '1px'

            let height = 0
            //let stat
            for (let i = 0; i < doc.childElementCount; i++) {
                const c = doc.children[i],
                    computedStyle = c.currentStyle || getComputedStyle(c)

                c.append(EMPTY_DIV)

                const r = c.getBoundingClientRect(),
                    h = r.bottom - doc.offsetTop + doc.scrollTop + (parseInt(computedStyle.marginBottom) || 0) - 1 - ADD_1PX

                if (height < h) {
                    height = h
                    //stat = [c, h, r, doc.offsetTop, doc.scrollTop, c.offsetTop, c.offsetHeight]
                }

                EMPTY_DIV.remove()
            }

            if (ADD_1PX) el.style.minHeight = ''

            //console.log(...stat)

            return height
        }

    let _clientHeight,

        updateId,

        itemCount = 0,
        maxPosition = -1,

        position = -1,
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
        posOffset

    const update = () => {
            if (updateId)
                cancelAnimationFrame(updateId)
            updateId = requestAnimationFrame(updateFrame)
        },
        updateCancel = () => {
            if (updateId) {
                cancelAnimationFrame(updateId)
                updateId = 0
            }
        },
        updateNow = () => {
            updateCancel()
            updateFrame()
        }

    function hsPop(position) {
        let h

        if (hsBinded[position]) {
            h = hsBinded[position]
            delete hsBinded[position]

            //console.log('binded', position)

            return h
        }

        let item = _getItem(position),
            type = item?.type || 'default',
            hsTypeCache = hsCache[type]

        if (!hsTypeCache)
            hsCache[type] = hsTypeCache = []

        if (item?.id) {
            let index = findIndex(hsTypeCache, ['id', item.id])
            if (index < 0)
                index = findIndex(hsTypeCache, ['id', undefined])

            if (index > -1) {
                h = hsTypeCache[index]
                hsTypeCache.splice(index, 1)
            }
        } else {
            h = hsTypeCache.pop()
        }

        if (!h) {
            const factory = slots[type] || emptySlot
            h = factory()

            h.position = position
            h.$mount()
            h._isMounted = true

            if (h.$options.mounted) for (const hook of h.$options.mounted)
                hook.call(h)

            for (const c of h.$children) if (c.$options.mounted) for (const hook of c.$options.mounted)
                hook.call(c)

            //vm.callHook(vm, 'mounted')
            //h.$emit = (...args) => vm.$emit.apply(vm, args)
            h._watcher.active = false

            h.position = -1
            h.position = position

            h.style = h.$el.style

            const style = h.style,
                computedStyle = h.$el.currentStyle || getComputedStyle(h.$el)

            style.position = 'absolute'
            style.left = 0
            style.right = 0

            container.append(h.$el)

            h.marginTop = parseFloat(computedStyle.marginTop) || 0
            h.marginBottom = parseFloat(computedStyle.marginBottom) || 0

            style.marginTop = 0
            style.marginBottom = 0

            if (computedStyle.maxHeight.endsWith('%')) {
                h.maxHRatio = (parseFloat(computedStyle.maxHeight) || 0) / 100
                style.maxHeight = 'initial'
            }

            if (computedStyle.minHeight.endsWith('%')) {
                h.minHRatio = (parseFloat(computedStyle.minHeight) || 0) / 100

                style.minHeight = 'initial'
            } else {
                h.minHeight = (parseFloat(computedStyle.minHeight) || h.$el.offsetHeight)
            }

            //console.log('create', position)
        } else {
            if (!h.$el.parentElement)
                container.append(h.$el)

            //h.style.display = ''

            h.position = -1
            h.position = position
            h._update(h._render(), false)

            //console.log('bind', position, h.source)
        }

        h.id = item?.id
        h.top = position ? 0 : headerHeight

        if (h.calcHeight) {
            h.$el.style.height = ''
            h.height = h.$el.offsetHeight + h.top

            if (position === maxPosition)
                h.height += footerHeight

            let _height = clientHeight
            for (let i = position - 1; i >= 0; i--) {
                let _h

                if (i >= hsPosition && i < hsPosition + hs.length) {
                    _h = hs[i - hsPosition]
                } else {
                    hsPush(_h = hsPop(i))
                }

                if (_h.calcHeight) break

                _height -= _h.height
                if (_height <= h.height) break
            }

            if (h.height < _height) {
                h.$el.style.height = (_height - h.top - footerHeight) + 'px'

                if (position !== maxPosition)
                    _height -= footerHeight

                h.height = _height
            }
        } else if (h.maxHRatio > 0) {
            if (h.minHRatio) h.minHeight = h.minHRatio * (windowHeight - headerHeight - footerHeight) - h.marginBottom

            h.height = mmax(h.minHeight, h.maxHRatio * (windowHeight - headerHeight - footerHeight) - h.marginBottom)
                + h.top + (position === maxPosition ? footerHeight : 0)

            //Doing it later:
            //h.style.height = h.height + 'px'
        } else {
            h.height = h.$el.offsetHeight + h.top

            if (position === maxPosition)
                h.height += footerHeight
        }

        return h
    }

    function hsPush(h) {
        if (h.height) {
            hsBinded[h.position] = h

            return
        }

        let type = h.type,
            hsTypeCache = hsCache[type]

        //h.$el.remove()
        //h.style.display = 'none'

        if (!hsTypeCache) {
            //console.log('hsPush', {hsCache, slots, type, h})

            hsCache[type] = hsTypeCache = []
        }

        hsTypeCache.push(h)
    }

    function hsFlush() {
        for (let i in hsBinded) {
            const h = hsBinded[i]
            h.height = 0
            hsPush(h)
        }

        hsBinded.length = 0

        for (const type in hsCache) {
            const hsTypeCache = hsCache[type]

            for (const h of hsTypeCache) {
                if (h.$el.parentElement) {
                    //console.log('hsFlush.remove', {'h.type': h.type, 'h.position': h.position})

                    h.$el.remove()
                }
            }
        }
    }

    function hsInvalidate(_position, count) {
        if (hsPosition >= itemCount) {
            if (_position <= 1) firstHeight = 0
            lastHeight = 0

            for (const h of hs) h.height = 0

            return true
        }

        if (!count) return true

        if (_position - 1 >= hsPosition && _position - 1 <= hsPosition + hs.length
            || hsPosition >= _position - 1 && hsPosition <= _position + count + 1) {

            if (_position <= 1)
                firstHeight = 0

            if (_position + count + 1 >= itemCount)
                lastHeight = 0

            for (let i = mmax(0, _position - 1 - hsPosition), len = mmin(hs.length, _position + count + 1 - hsPosition); i < len; i++)
                hs[i].height = 0

            return true
        }

        if (_position + count + 1 >= itemCount && lastHeight) {
            if (_position <= 1)
                firstHeight = 0

            lastHeight = 0

            return true
        }

        if (_position <= 1) {
            firstHeight = 0

            return true
        }
    }

    function hsCleanUp() {
        while (hs.length) hsPush(hs.pop())
        hsFlush()

        for (const type in hsCache) {
            const hsTypeCache = hsCache[type]
            for (const h of hsTypeCache) {
                h.$destroy()
            }
        }

        hsCache = {}
    }

    function _scrollMax() {
        let fluidCount = 0,
            fluidHeight = 0

        for (let h of hs)
            if (h.maxHRatio) {
                fluidCount++
                fluidHeight += h.height
            }

        let height = hs.length === itemCount ? hsHeight : mround(mmin(9 * clientHeight,
            itemCount === fluidCount
                ? fluidHeight
                : (hs.length > fluidCount
                    ? (hsHeight - fluidHeight) * itemCount / (hs.length - fluidCount) + fluidHeight
                    : 2 * clientHeight
                )
        ))

        //console.log({height, scrollHeight, clientHeight})

        if (scrollHeight !== height) {
            scrollHeight = height

            wrapper.style.height = (scrollHeight - headerHeight - footerHeight) + 'px'
            if (isFixed)
                container.style.width = wrapper.offsetWidth + 'px'
            else
                container.style.height = (mmax(scrollHeight, clientHeight) - footerHeight) + 'px'

            // clientHeight = _clientHeight()
            // clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
            scrollMax = mmax(0, doc.scrollHeight - clientHeight)

            // console.log('scrollMax', {
            //     scrollHeight,
            //     doc_scrollHeight: doc.scrollHeight,
            //     clientHeight,
            //     scrollMax,
            // })
        }
    }

    function updateFrame() {
        itemCount = _itemCount()
        maxPosition = itemCount - 1

        while (hs.length) hsPush(hs.pop())

        if (!itemCount) {
            hsFlush()

            if (!scrolling)
                vm.$emit('laidout', 0, hs)

            win.dispatchEvent(scrolledEvent = new Event('scroll'))

            return
        }

        let h, up, down, i

        if (!firstHeight) {
            h = hsPop(0)
            firstHeight = h.height
            hsPush(h)
        }

        if (!lastHeight) {
            h = hsPop(maxPosition)
            lastHeight = h.height
            hsPush(h)
        }

        maxOffset = clientHeight - lastHeight

        scrollTop = doc.scrollTop

        if (scrolling && !keyboard) {
            scrolled = Date.now()

            if (touched) {
                hs.push(h = hsPop(hsPosition = touchPosition))

                hsOffset = touchOffset - scrollTop + touchTop
            } else {
                scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? scrollTop / scrollMax : 0))

                const positionReal = maxPosition * scrollRatio

                hs.push(h = hsPop(hsPosition = mfloor(positionReal)))

                hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height
            }

            // console.log('scrolling', {hsPosition, hsOffset, scrollTop, scrollMax, touching})
        } else if (posId) {
            hsPosition = posPosition
            hsOffset = posOffset

            hs.push(h = hsPop(hsPosition))
        } else {
            if (stackFromBottom) {
                if (position > maxPosition) {
                    hsPosition = maxPosition
                    hs.push(h = hsPop(hsPosition))
                } else {
                    hsPosition = position < 0 ? (stickToTop ? 0 : maxPosition) : position
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = clientHeight - offset - h.height
                }
            } else {
                if (position > maxPosition) {
                    hsPosition = maxPosition
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = maxOffset
                } else {
                    hsPosition = position > -1 ? position : 0
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = offset
                }
            }

            // console.log({'-> hsPosition': hsPosition, hsOffset, position, offset, clientHeight})
        }

        up = hsOffset
        down = up + h.height

        i = hsPosition
        while (i-- > 0 && up > 0) {
            hs.unshift(h = hsPop(i))
            up -= h.height
        }

        i = hsPosition
        if (hs.length > 1) hsPosition -= hs.length - 1

        hsHeight = down - up
        hsOffset = up

        while (++i < itemCount && (down < clientHeight || hsHeight < clientHeightEx)) {
            hs.push(h = hsPop(i))
            down += h.height
            hsHeight += h.height
        }

        const bottomSpace = clientHeight - down
        //if (!scrolling && !scrolled && bottomSpace > 0) {
        if (bottomSpace > 0) {
            i = hsPosition;
            while (i-- > 0 && up > -bottomSpace) {
                hs.unshift(h = hsPop(i))
                up -= h.height
                hsHeight += h.height
                hsPosition--
            }

            hsOffset = up
        }

        allShown = hs.length === itemCount && hsHeight < clientHeightEx + 1

        //if (!scrolling && !scrolled) {
        if (!scrolling) {
            if (stackFromBottom) {
                if (bottomSpace > 0) {
                    up += bottomSpace
                    hsOffset = up
                } else if (!hsPosition && hsOffset > 0) {
                    up -= mmin(-bottomSpace, hsOffset)
                    hsOffset = up
                }
            } else if (!hsPosition) {
                if (hsOffset >= 0) {
                    up = 0
                    hsOffset = 0
                } else if (bottomSpace > 0) {
                    up += mmin(bottomSpace, -hsOffset)
                    hsOffset = up
                }
            }
        }

        let clearScrolled = true

        if (!keyboard) {
            if (allShown) {
                if (!scrolling) {
                    _scrollMax()

                    if (!stackFromBottom || stickToTop) {
                        if (Math.abs(scrollTop + hsOffset) >= 1)
                            _scroll(scrollTop = -hsOffset)
                    }
                } else {
                    hsOffset = -mround(scrollMax * hsOffset / (clientHeight - hsHeight))
                }

                if (!stackFromBottom || stickToTop) {
                    up = -scrollTop
                }
            } else if (!scrolling) {
                const scrollClue = scrollTop < .5 ? -1 : (scrollTop + .5 > scrollMax ? 1 : 0)

                _scrollMax()

                // scrollRatio = scrollTop / scrollTopMax
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

                let newScrollTop = scrollTop, hOffset = hsOffset, delta = Number.MAX_VALUE, offsetRatio = 1
                //const stat = []

                for (let i = 0; i < hs.length; i++) {
                    const hh = hs[i].height,
                        _scrollTop = scrollMax * (hOffset - (hsPosition + i) * hh) / (maxOffset - maxPosition * hh),
                        _offsetRatio = maxPosition * _scrollTop / scrollMax - (hsPosition + i)

                    if (scrolled) {
                        const _delta = mabs(scrollTop - _scrollTop)

                        //stat.push({'#': hsPosition + i, _scrollTop, _offsetRatio, _delta})

                        if (_offsetRatio > -NEAR_ZERO && _offsetRatio < 1 && _delta < delta) {
                            delta = _delta
                            newScrollTop = _scrollTop
                            //break
                        }
                    } else {
                        //stat.push({'#': hsPosition + i, _scrollTop, _offsetRatio})

                        if (_offsetRatio > -NEAR_ZERO && _offsetRatio < offsetRatio) {
                            offsetRatio = _offsetRatio
                            newScrollTop = _scrollTop
                            //break
                        }
                    }

                    hOffset += hh
                }

                const _scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? newScrollTop / scrollMax : 0)),
                    _positionReal = maxPosition * _scrollRatio,
                    _hsPosition = mfloor(_positionReal)

                // if (_hsPosition >= hsPosition && _hsPosition < hsPosition + hs.length) {
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
                    let scrollDelta = 0

                    //console.log({scrollClue, scrollTop, scrollMax})

                    if (scrollClue < 0) {
                        scrollDelta = !hsPosition ? hsOffset : -newScrollTop

                        //console.log({scrollDelta})

                        _scroll(scrollTop = newScrollTop = 0)
                    } else if (scrollClue > 0) {
                        const hsOffsetOld = hsOffset
                        //hsOffset -= clientHeight - clientHeightOld
                        scrollDelta = hsPosition + hs.length - 1 === maxPosition ? hsOffset - (clientHeight - hsHeight) : scrollMax - newScrollTop

                        //console.log({scrollDelta, delta: clientHeight - clientHeightOld, hsOffset, hsOffsetOld})

                        _scroll(scrollTop = newScrollTop = scrollMax)
                    }

                    if (mabs(scrollDelta) >= 1) {
                        clearScrolled = false

                        const r = mmax(0, mmin(1, (Date.now() - scrolled) / 2000)),
                            hsOffsetOld = hsOffset
                        hsOffset -= r * scrollDelta

                        //console.log({r, hsOffsetOld, hsOffset})

                        update()
                    } else {
                        if (scrollClue < 0) {
                            if (!hsPosition) {
                                hsOffset = 0
                            }
                        } else if (scrollClue > 0) {
                            if (hsPosition + hs.length - 1 === maxPosition) {
                                hsOffset = clientHeight - hsHeight
                            }
                        }
                    }
                }

                if (mabs(scrollTop - newScrollTop) >= 1) {
                    //console.log('adjustScroll', {scrollTop, newScrollTop})

                    _scroll(scrollTop = newScrollTop)
                }
            }
        }

        if (!scrolling)
            clientHeightOld = clientHeight

        // console.log(keyboardAnchor.getBoundingClientRect().bottom, clientHeight)

        const scrollOffset = (isFixed ? 0 : (
            keyboard ? scrollTop + keyboardAnchor.getBoundingClientRect().bottom - clientHeight : scrollTop
        ))
        down = up = hsOffset
        //down = hsOffset + hsHeight

        let j = 0, fluidCheck = 0
        while (j < hs.length) {
            if (down > clientHeight - footerHeight) {
                h = hs.pop()
                hsHeight -= h.height

                hsPush(h)

                continue
            }

            h = hs[j]
            //h.style.zIndex = j
            //h.style.order = j

            if (h.maxHRatio) {
                let top = down, height = h.height - h.top

                if (hsPosition + j === maxPosition)
                    height -= footerHeight

                if (!allShown) {
                    if (j === 0 && down + h.top < 0) {
                        top = down + mmin(height - h.minHeight, -down - h.top)
                        height -= top - down
                    }

                    if (j === hs.length - 1 && down + height > clientHeight)
                        height = mmax(h.minHeight, windowHeight - headerHeight - footerHeight - down)
                }

                h.style.top = scrollOffset + top + h.top + 'px'
                h.style.height = height + 'px'

                fluidCheck = fluidCheck | 2
            } else {
                h.style.top = scrollOffset + down + h.top + 'px'
                fluidCheck = fluidCheck | 1
            }

            down += h.height

            if (down < headerHeight) {
                hsPosition++
                hsOffset += h.height
                hsHeight -= h.height

                hs.splice(j, 1)
                hsPush(h)
            } else {
                j++
            }
        }

        if (scrolling && touched) {
            touchPosition = hsPosition
            touchOffset = hsOffset
            touchTop = scrollTop
        }

        hsFlush()

        if (stackFromBottom) {
            position = hsPosition + hs.length - 1
            offset = clientHeight - hsHeight - hsOffset

            if (fluidCheck === 3) {
                for (i = hs.length - 1; i >= 0; i--) {
                    if (hs[i].maxHRatio) {
                        position--
                        offset += hs[i].height
                    } else break
                }
            } else if (fluidCheck === 2 && hs.length === itemCount) {
                position = -1
            }
        } else {
            position = hsPosition
            offset = hsOffset

            if (fluidCheck === 3) {
                for (h of hs) {
                    if (h.maxHRatio) {
                        position++
                        offset += h.height
                    } else break
                }
            } else if (fluidCheck === 2 && hs.length === itemCount) {
                position = -1
            }
        }

        // console.log({
        //     '<- hsPosition': hsPosition,
        //     hsOffset,
        //     position,
        //     offset,
        //     clientHeight,
        // })

        if (!scrolling && clearScrolled) {
            scrolled = 0

            vm.$emit('laidout', hsPosition, hs)
        }

        if (scrolling) win.dispatchEvent(scrolledEvent = new Event('scroll'))
        vm.$emit('scrolled', hsPosition, hs)
    }

    let scrolled = 0,
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
        keyboardAnchor

    const onResize = () => {
        hsInvalidate(0, itemCount)

        clientHeight = _clientHeight()
        windowHeight = isWindow ? _windowHeight() : clientHeight
        clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
        scrollMax = mmax(0, doc.scrollHeight - clientHeight)

        headerHeight = wrapper.offsetTop - doc.offsetTop
        if (isFixed)
            container.style.width = wrapper.offsetWidth + 'px'
        else
            container.style.top = -headerHeight + 'px'

        const bodyHeight = _bodyHeight()
        footerHeight = bodyHeight - headerHeight - el.offsetHeight

        // console.log('resize', {
        //     clientHeight,
        //     clientHeightEx,
        //     scrollMax,
        //     headerHeight,
        //     bodyHeight,
        //     elHeight: el.offsetHeight,
        //     footerHeight
        // })

        update()
    }, onScroll = ev => {
        if (scrolledEvent === ev) {
            scrolledEvent = null
            return
        }

        // console.log('onScroll', {
        //     type: ev.type,
        //     timeStamp: ev.timeStamp,
        //     scrollTime,
        //     scrollStarted,
        //     scrollTop,
        //     scrollMax,
        // })

        ev.cancelBubble = true

        if (ev.timeStamp > scrollTime + 99)
            onScrollContinue(ev)

        if (scrollStarted) {
            scrolling = true

            update()
        }
    }, onScrollContinue = ev => {
        //console.log('onScrollContinue', ev?.type)

        if (!scrollStarted && (keyboard || touching || !touched))
            scrollStarted = 1

        if (scrollStarted > 0 && ev && (ev.type === 'mousedown' || ev.type === 'touchstart')) {
            scrollStarted = -1

            //win.addEventListener('mousemove', onScrollContinue)
            addEventListener('mouseup', onScrollEnd)
            addEventListener('touchend', onScrollEnd)
        }

        if (scrollEndTimeout)
            clearTimeout(scrollEndTimeout)
        if (scrollStarted > 0)
            scrollEndTimeout = setTimeout(onScrollEnd, 500)
    }, onScrollEnd = ev => {
        //console.log('onScrollEnd', ev?.type)

        if (scrollStarted < 0) {
            removeEventListener('mouseup', onScrollEnd)
            removeEventListener('touchend', onScrollEnd)
            //win.removeEventListener('mousemove', onScrollContinue)
        }

        scrollStarted = 0

        if (scrollEndTimeout) {
            clearTimeout(scrollEndTimeout)
            scrollEndTimeout = 0
        }

        if (scrolling) {
            scrolling = false

            //console.log('onScrollEnd', ev, scrollTop, scrollMax)

            update()
        }
    }, onTouchStart = ev => {
        //console.log('onTouchStart', ev?.type, allShown)

        if (allShown) {
            onScrollContinue(ev)
            return
        }

        //touchEnd = 0
        touchTop = doc.scrollTop
        touchPosition = hsPosition
        touchOffset = hsOffset

        win.addEventListener('touchend', onTouchEnd)

        touched = true
        touching = true
    }, onTouchEnd = ev => {
        //console.log('onTouchEnd', ev?.type)

        win.removeEventListener('touchend', onTouchEnd)

        // const scrollTop = doc.scrollTop
        // if (scrollTop < 0) {
        //     touchEnd = scrollTop
        // } else if (scrollTop > scrollMax) {
        //     touchEnd = scrollTop - scrollMax
        // } else {
        //     touchEnd = 0
        // }

        //console.log('onTouchEnd', {touchEnd, scrollTop, scrollMax})

        if (touching) {
            touching = false

            update()
        }
    }, onKeyboardFocus = ev => {
        console.log('onKeyboardFocus', ev.target.nodeName, document.activeElement?.nodeName)
        // , {
        //     position,
        //     offset,
        //     hsPosition,
        //     hsOffset,
        // }, keyboardAnchor, keyboardAnchor.getBoundingClientRect())

        keyboard = ev.target.nodeName === document.activeElement?.nodeName
        //doc.style.position = keyboard ? 'fixed' : ''
        update()
    }, onKeyboardFocusOut = ev => {
        console.log('onKeyboardFocusOut', ev.target.nodeName, document.activeElement?.nodeName)

        if (['TEXTAREA', 'INPUT'].indexOf(ev.target.nodeName) < 0 && ['TEXTAREA', 'INPUT'].indexOf(document.activeElement?.nodeName) < 0) {
            keyboard = false
            //doc.style.position = keyboard ? 'fixed' : ''
            update()
        }
    }, onKeyboardBlur = ev => {
        console.log('onKeyboardBlur', ev.target.nodeName, document.activeElement?.nodeName)

        keyboard = false
        //doc.style.position = keyboard ? 'fixed' : ''
        update()
    }, onKeyboardTouch = ev => {
        const _keyboard = ['TEXTAREA', 'INPUT'].indexOf(ev.target.nodeName) > -1 || ['TEXTAREA', 'INPUT'].indexOf(document.activeElement?.nodeName) > -1
        if (keyboard !== _keyboard) {
            console.log('onKeyboardTouch', ev.target.nodeName, document.activeElement?.nodeName)

            keyboard = _keyboard
            //doc.style.position = keyboard ? 'fixed' : ''
            update()
        }
    }

    function created() {
        source = this.source

        _itemCount = source.itemCount
        _getItem = source.getItem

        stackFromBottom = this.stackFromBottom

        stickToTop = this.stickToTop

        itemCount = _itemCount()
        maxPosition = itemCount - 1
    }

    function mounted() {
        const Vue = this.$root.__proto__.constructor

        el = this.$el
        win = el.closest('.recycler-layout')?.parentElement ?? el.closest('.recycler-window') ?? window
        isWindow = win === window
        isFixed = false//isWindow
        doc = isWindow ? document.documentElement : win
        _clientHeight = isWindow ? () => win.innerHeight : () => doc.clientHeight

        wrapper = el.children[0]
        container = wrapper.children[0]

        if (isFixed) {
            container.style.position = 'fixed'
            container.style.top = 0
            //container.style.left = 0
            //container.style.right = 0
            container.style.bottom = 0
        }

        addEventListener('resize', onResize)
        win.addEventListener('scroll', onScroll, true)
        win.addEventListener('wheel', onScrollContinue, true)
        win.addEventListener('mousedown', onScrollContinue, true)

        win.addEventListener('touchstart', onTouchStart, true)

        if (is_iOS()) {
            addEventListener('focus', onKeyboardFocus, true)
            addEventListener('blur', onKeyboardBlur, true)
            addEventListener('touchstart', onKeyboardTouch, true)
            addEventListener('focusout', onKeyboardFocusOut, true)

            keyboardAnchor = document.createElement('div')
            keyboardAnchor.style.position = 'fixed'
            keyboardAnchor.style.bottom = 0
            keyboardAnchor.style.height = '1px'
            document.body.append(keyboardAnchor)
        }

        onResize()
        clientHeightOld = clientHeight
        //onScrollContinue()
        //win.dispatchEvent(new Event('scroll'))

        win.recycler = this

        loop: for (const type in vm.$slots)
            for (const vnode of vm.$slots[type]) {
                if (!vnode || !vnode.tag) continue;

                ((type, vnode) => {
                    const Ctor = vnode.componentOptions
                        ? vnode.componentOptions.Ctor
                        : Vue.extend({
                            render(h) {
                                return vm.$slots[type]
                            }
                        }),
                        oldOptions = Ctor.options,
                        options = Object.assign({}, oldOptions),
                        dataFn = options.data

                    options.data = function () {
                        const data = dataFn ? dataFn.call(this) : {}
                        data.position = -1
                        return data
                    }

                    options.computed = defaults({
                        type: () => type,
                        source: () => source,
                        item() {
                            return _getItem(this.position)
                        }
                    }, oldOptions.computed)

                    delete options.computed.position

                    if (vnode.componentOptions) {
                        slots[type] = () => {
                            Ctor.options = options
                            const o = new Ctor({
                                _isComponent: true,
                                _parentVnode: vnode,
                                parent: vm
                            })
                            Ctor.options = oldOptions

                            return o
                        }
                    } else {
                        slots[type] = () => {
                            Ctor.options = options
                            const o = new Ctor({
                                // _isComponent: true,
                                // _parentVnode: vnode,
                                parent: vm
                            })
                            Ctor.options = oldOptions

                            return o
                        }
                    }
                })(type, vnode)

                continue loop
            }

        emptySlot = () => new Vue({
            render: h => h('div')
        })

        //console.log(slots, emptySlot)

        source.attach(vm)
    }

    function beforeDestroy() {
        source.detach(vm)

        if (win.recycler === this)
            delete win.recycler

        removeEventListener('resize', onResize)

        win.removeEventListener('scroll', onScroll, true)
        win.removeEventListener('wheel', onScrollContinue, true)
        win.removeEventListener('mousedown', onScrollContinue, true)
        win.removeEventListener('mousemove', onScrollContinue, true)

        removeEventListener('focus', onKeyboardFocus, true)
        removeEventListener('blur', onKeyboardBlur, true)
        removeEventListener('touchstart', onKeyboardTouch, true)
        removeEventListener('focusout', onKeyboardFocusOut, true)

        if (keyboardAnchor) keyboardAnchor.remove()
        if (keyboard) {
            keyboard = false
            //doc.style.position = keyboard ? 'fixed' : ''
        }

        scrolling = false
        onScrollEnd()

        win.removeEventListener('touchstart', onTouchStart, true)
        win.removeEventListener('touchend', onTouchEnd, true)

        touched = false
        touching = false
        onTouchEnd()

        updateCancel()

        // for (const h of hs) hsPush(h)
        // hs.length = 0
        // hsBinded.length = 0
        //
        // for (const key in hsCache) delete hsCache[key]
        //
        hsCleanUp()

        firstHeight = 0
        lastHeight = 0
        scrollHeight = 0
    }

    mergeWith(this.$options, {created, mounted, beforeDestroy}, (objValue, srcValue) =>
        Array.isArray(objValue) ? objValue.concat([srcValue]) : (objValue ? undefined : [srcValue]))

    this.$options.watch = defaults({
        source(newValue) {
            if (source !== newValue) {
                source.detach(vm)
                source = newValue
                source.attach(vm)

                _itemCount = source.itemCount
                _getItem = source.getItem

                this.onDatasetChanged()

                hsCleanUp()
            }
        },

        stackFromBottom(newValue) {
            stackFromBottom = newValue

            this.onDatasetChanged()
        },

        stickToTop(newValue) {
            stickToTop = newValue

            this.onDatasetChanged()
        },

    }, this.$options.watch)

    this.$options.methods = defaults({
        onDatasetChanged() {
            //console.log('update', {hsPosition, position, _position, count})

            if (hsInvalidate(0, _itemCount())) update()
        },

        onUpdate(_position, count) {
            //console.log('update', {hsPosition, position, _position, count})

            if (hsInvalidate(_position, count)) update()
        },

        onInsert(_position, count) {
            // console.log('insert', {
            //     hsPosition,
            //     position,
            //     offset,
            //     _position,
            //     count,
            //     stackFromBottom,
            //     item: _getItem(_position)
            // })

            if (position === -1) {
                if (stackFromBottom) {
                    position = maxPosition + count
                    offset = 0
                } else {
                    position = 0
                    offset = 0
                }
            } else if (stackFromBottom
                && _position >= maxPosition
                && position === maxPosition
                && -offset < (footerHeight + lastHeight) / 2
            ) {
                position = maxPosition + count
                offset = 0
            } else {
                if (_position < position) position += count
            }

            if (touched && _position < touchPosition)
                touchPosition += count

            if (posId && _position < posPosition)
                posPosition += count

            for (let i = mmax(0, _position - hsPosition); i < hs.length; i++)
                hs[i].position += count

            if (hsInvalidate(_position, count)) update()

            // console.log('inserted', {hsPosition, position, offset, item: _getItem(_position)})
        },

        onRemove(_position, count) {
            //console.log('remove', {hsPosition, position, _position, count, offset, stackFromBottom})

            const invalid = hsInvalidate(_position, count)

            if (!_itemCount())
                position = -1
            else {
                if (_position < position)
                    position -= mmin(count, position - _position + 1)

                if (touched && _position <= touchPosition)
                    touchPosition -= mmin(count, touchPosition - _position + 1)

                if (posId && _position <= posPosition)
                    posPosition -= mmin(count, posPosition - _position + 1)
            }

            if (invalid) {
                for (let i = mmax(0, _position + count - hsPosition); i < hs.length; i++)
                    hs[i].position -= count

                // for (let i = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); i < len; i++) {
                //     const [h] = hs.splice(i, 1)
                //     len--
                //     i--
                //
                //     //hsHeight -= h.height
                //     h.height = 0
                //     hsPush(h)
                //     //h.$el.remove()
                // }

                update()
            }

            //console.log('removed', {hsPosition, position, _position, count, offset, stackFromBottom})
        },

        update,
        updateNow,

        setStackFromBottom(_stackFromBottom) {
            if (stackFromBottom !== _stackFromBottom) {
                updateNow()

                stackFromBottom = _stackFromBottom

                let allFluid = true

                if (stackFromBottom) {
                    position = hsPosition + hs.length - 1
                    offset = clientHeight - hsHeight - hsOffset

                    for (let i = hs.length - 1; i >= 0; i--) {
                        if (hs[i].maxHRatio) {
                            position--
                            offset += hs[i].height
                        } else {
                            allFluid = false
                            break
                        }
                    }
                } else {
                    position = hsPosition
                    offset = hsOffset

                    for (let h of hs) {
                        if (h.maxHRatio) {
                            position++
                            offset += h.height
                        } else {
                            allFluid = false
                            break
                        }
                    }
                }

                if (allFluid && hs.length === itemCount) {
                    position = -1
                }
            }
        },

        position(_position, _offset = 0) {
            if (_position === undefined)
                return [
                    position,
                    stackFromBottom
                        ? position !== maxPosition ? offset - footerHeight : offset
                        : position ? offset - headerHeight : offset
                ]

            position = _position < 0 ? itemCount + _position : _position ?? 0
            offset = stackFromBottom
                ? position !== maxPosition ? _offset + footerHeight : _offset
                : position ? _offset + headerHeight : _offset

            console.log('position', {position, offset})

            update()
        },

        positionFromTop(_position, _offset) {
            if (stackFromBottom) {
                vm.setStackFromBottom(false)
                vm.position(_position, _offset)
                vm.setStackFromBottom(true)
            } else {
                vm.position(_position, _offset)
            }
        },

        positionSmooth(positionFn, _offset = 0, _stackFromBottom = stackFromBottom) {
            if (posId) cancelAnimationFrame(posId)
            if (posResolve) posResolve()

            let prevPosition, prevOffset

            return new Promise(resolve => {
                posResolve = resolve

                const next = () => {
                    posId = null

                    if (scrolling || prevPosition === hsPosition && mabs(prevOffset - hsOffset) < 2) {
                        posResolve = null
                        resolve()

                        return
                    }

                    prevPosition = hsPosition
                    prevOffset = hsOffset

                    posPosition = hsPosition
                    posOffset = hsOffset

                    const
                        positionDelta = 48,
                        //positionDelta = (clientHeight - headerHeight - footerHeight) / 8,
                        _position = isFunction(positionFn) ? positionFn() : positionFn

                    if (_position < 0 && isFunction(positionFn)) {
                        posResolve = null
                        resolve()

                        return
                    }

                    if (_position >= hsPosition && _position < hsPosition + hs.length) {
                        let offset = _offset
                        if (_stackFromBottom) {
                            const h = hs[_position - hsPosition]
                            offset = clientHeight - (_position !== maxPosition ? _offset + footerHeight : _offset) - h.height
                        } else {
                            offset = _position ? _offset + headerHeight : _offset
                        }

                        let hOffset = hsOffset

                        for (let i = 0; i < _position - hsPosition; i++)
                            hOffset += hs[i].height

                        const delta = offset - hOffset
                        if (mabs(delta) < 2) {
                            posResolve = null
                            resolve()

                            return
                        }

                        posOffset = hsOffset + mmin(mabs(delta), positionDelta) * (delta < 0 ? -1 : 1)
                    } else {
                        if (_position < hsPosition) {
                            posOffset = hsOffset + positionDelta
                        } else {
                            posPosition = hsPosition + hs.length - 1
                            posOffset = hsOffset + hsHeight - hs[hs.length - 1].height - positionDelta
                        }
                    }

                    update()

                    posId = requestAnimationFrame(next)
                }

                next()
            })
        },

        startPosition() {
            return hsPosition
        },

        startOffset() {
            return hsOffset
        },

        startPart() {
            return hs.length ? hsOffset + hs[0].height - footerHeight : 0
        },

        endPosition() {
            return hsPosition + hs.length - 1
        },

        // positionReal = maxPosition * scrollRatio = 1
        // maxPosition * scrollTop / scrollTopMax = 1
        // scrollTop = scrollTopMax / maxPosition
        scrollTop: top => {
            if (top !== undefined) {
                position = 0
                offset = stackFromBottom ? clientHeight + top - firstHeight : -top

                //console.log('scrollTop ->', {position, top, hsOffset})

                update()

                return
            }

            const _scrollTop = (scrolling || scrolled) && touched ? doc.scrollTop : (hsPosition
                ? firstHeight + (doc.scrollTop - scrollMax / maxPosition) / (scrollMax - scrollMax / maxPosition) * (scrollMax - firstHeight)
                : -hsOffset)

            //console.log('scrollTop <-', {scrolling, scrolled, _scrollTop})

            return _scrollTop
        },
    }, this.$options.methods)
}

export default {
    props: {
        source: {
            type: Object,
            required: true
        },
        stackFromBottom: Boolean,
        stickToTop: Boolean,
    },

    // watch: {
    //     source(newValue, value) {
    //         console.log(newValue, value)
    //     }
    // },

    render(h) {
        return h('div', {
                attrs: {
                    class: 'recycler',
                }
            }, [h('div', {
                attrs: {
                    style: 'position:relative;',
                }
            }, [h('div', {
                attrs: {
                    class: 'recycler-items',
                    style: 'position:relative;overflow:hidden;',
                }
            })])]
        )
    },

    beforeCreate
}
