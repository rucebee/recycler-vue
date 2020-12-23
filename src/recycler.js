import {
    defaults as l_defaults,
    extend as l_extend,
    mergeWith as l_mergeWith,
    find as l_find,
    findIndex as l_findIndex
} from 'lodash-es'

import {animate, is_iOS} from '@rucebee/util'

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
        emptySlot

    const vm = this,
        slots = {},

        hs = [],
        hsBinded = [],
        hsCache = {},

        timeStamp = Date.now() <= new Event('check').timeStamp ? Date.now : performance.now.bind(performance),

        _scroll = top => {
            win.scrollTo(doc.scrollLeft, top)
            scrollTime = timeStamp()
            //console.log('_scroll', scrollTime)
        },

        _clientHeight = isWindow ? () => win.innerHeight : () => doc.clientHeight,

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

    let updateId,

        itemCount = 0,
        maxPosition = -1,

        position = -1,
        offset = 0,

        hsPosition = 0,
        hsOffset = 0,
        hsHeight = 0,
        allShown = true,

        clientHeight,
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

        scrollTime = 0

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
            let index = l_findIndex(hsTypeCache, ['id', item.id])
            if (index < 0)
                index = l_findIndex(hsTypeCache, ['id', undefined])

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
            //h.$emit = (...args) => vm.$emit.apply(vm, args)
            h._watcher.active = false

            h.position = -1
            h.position = position

            h.style = h.$el.style

            const style = h.style
            style.position = 'absolute'
            style.left = 0
            style.right = 0
            style.marginTop = 0
            style.marginBottom = 0

            container.append(h.$el)

            const computedStyle = h.$el.currentStyle || getComputedStyle(h.$el)
            if (computedStyle.maxHeight.endsWith('%')) {
                h.maxHeight = (parseInt(computedStyle.maxHeight) || 0) / 100
                h.minHeight = (parseInt(computedStyle.minHeight) || h.$el.offsetHeight)

                style.maxHeight = 'initial'
                style.minHeight = 'initial'
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

        h.top = 0
        if (!position) h.top += headerHeight

        if (h.maxHeight > 0) {
            h.height = mmax(h.minHeight, h.maxHeight * clientHeight)
                + h.top + (position == maxPosition ? footerHeight : 0)

            //Doing it later:
            //h.style.height = h.height + 'px'
        } else {
            h.height = h.$el.offsetHeight + h.top

            if (position == maxPosition)
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
                if (h.$el.parentElement)
                    h.$el.remove()
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

    function _scrollMax() {
        let fluidCount = 0,
            fluidHeight = 0

        for (let h of hs)
            if (h.maxHeight) {
                fluidCount++
                fluidHeight += h.height
            }

        let height = mround(mmin(9 * clientHeight,
            itemCount == fluidCount
                ? fluidHeight
                : (hs.length > fluidCount
                    ? (hsHeight - fluidHeight) * itemCount / (hs.length - fluidCount) + fluidHeight
                    : 2 * clientHeight
                )
        ))

        //console.log({height, scrollHeight, clientHeight})

        if (scrollHeight != height) {
            scrollHeight = height

            wrapper.style.height = (scrollHeight - headerHeight - footerHeight) + 'px'
            if (isFixed)
                container.style.width = wrapper.offsetWidth + 'px'
            else
                container.style.height = (scrollHeight - footerHeight) + 'px'

            // clientHeight = _clientHeight()
            // clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
            scrollMax = mmax(0, doc.scrollHeight - clientHeight)

            // console.log('scrollMax', {
            //     scrollHeight,
            //     _scrollHeight: doc.scrollHeight,
            //     clientHeight,
            //     scrollMax
            // })
        }
    }

    function updateFrame() {
        itemCount = _itemCount()
        maxPosition = itemCount - 1

        while (hs.length) hsPush(hs.pop())

        if (!itemCount) {
            hsFlush()

            if (!scrolling && !touching)
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

        scrollTop = win.scrollY

        // if (touching) {
        //     hsOffset -= scrollTop - touchTop
        //
        //     touchTop = scrollTop
        //
        //     hs.push(h = hsPop(hsPosition))
        // } else
        if (scrolling && !keyboard) {
            scrolled = true

            if (touching) {
                hs.push(h = hsPop(hsPosition = touchPosition))

                hsOffset = touchOffset - scrollTop + touchTop
            } else {
                scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? scrollTop / scrollMax : 0))

                const positionReal = maxPosition * scrollRatio

                hs.push(h = hsPop(hsPosition = mfloor(positionReal)))

                hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height

                //console.log('scrolling', {scrollRatio, hsPosition, hsOffset})
            }

            //console.log('scrolling', {hsPosition, hsOffset, scrollTop, touchTop, touching})
        } else if (stackFromBottom) {
            if (position > maxPosition) {
                hsPosition = maxPosition
                hs.push(h = hsPop(hsPosition))

                //hsOffset = -footerHeight
            } else {
                hsPosition = position > -1 ? position : maxPosition
                hs.push(h = hsPop(hsPosition))

                hsOffset = clientHeight - offset - h.height
                // if (hsPosition !== maxPosition)
                //     hsOffset -= footerHeight
            }

            //console.log('stackFromBottom <-', {hsPosition, hsOffset, position, offset})
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

            //console.log('stackFromBottom <-', {hsPosition, hsOffset, position, offset})
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

        allShown = hs.length == itemCount && hsHeight < clientHeightEx + 1

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

        if (allShown) {
            if (!scrolling) {
                _scrollMax()

                if (Math.abs(scrollTop + hsOffset) >= 1 && !keyboard)
                    _scroll(scrollTop = -hsOffset)
            } else {
                hsOffset = -mround(scrollMax * hsOffset / (clientHeight - hsHeight))
            }

            up = -scrollTop
        } else {
            // if (bottomSpace > 0) {
            //     up += bottomSpace
            //     hsOffset = up
            // }

            // if (hsPosition == 0 && hsOffset > 0) {
            //     hsOffset = 0
            //     up = 0
            //
            //     if (touching || !scrolling) {
            //         _scrollMax()
            //
            //         _scroll(touchTop = scrollTop = 0)
            //         scrollRatio = 0
            //     }
            // } else

            //if (touching || !scrolling) {
            if (!scrolling && !keyboard) {
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

                //console.log(stat)

                if (Math.abs(scrollTop - newScrollTop) >= 1) {
                    //console.log('adjustScroll', {scrollTop, newScrollTop})

                    _scroll(touchTop = scrollTop = newScrollTop)
                }
            }
        }

        // if (stackFromBottom && scrollHeight < clientHeight)
        //     up += clientHeight - scrollHeight

        if (keyboard && !isFixed) {
            console.log(keyboardAnchor.getBoundingClientRect().bottom, clientHeight)
        }

        const scrollOffset = isFixed ? 0 : (
            keyboard ? scrollTop + keyboardAnchor.getBoundingClientRect().bottom - clientHeight : scrollTop
        )
        down = up

        let j = 0, fluidCheck = 0
        while (j < hs.length) {
            if (down > clientHeight) {
                hsPush(hs.pop())
                continue
            }

            h = hs[j];
            //h.style.zIndex = j
            //h.style.order = j

            if (h.maxHeight) {
                let top = down, height = h.height - h.top

                if (hsPosition + j == maxPosition)
                    height -= footerHeight

                if (!allShown) {
                    if (j == 0 && down + h.top < 0) {
                        top = down + mmin(height - h.minHeight, -down - h.top)
                        height -= top - down
                    }

                    if (j == hs.length - 1 && down + height > clientHeight)
                        height = mmax(h.minHeight, clientHeight - down)
                }

                h.style.top = scrollOffset + top + h.top + 'px'
                h.style.height = height + 'px'

                fluidCheck = fluidCheck | 2
            } else {
                h.style.top = scrollOffset + down + h.top + 'px'
                fluidCheck = fluidCheck | 1
            }

            down += h.height

            if (down < 0) {
                hsPosition++
                hsOffset += h.height

                hs.splice(j, 1)
                hsPush(h)
            } else {
                j++
            }
        }

        if (scrolling && touching) {
            //console.log('fixed', {hsPosition, hsOffset})

            touchPosition = hsPosition
            touchOffset = hsOffset
            touchTop = scrollTop
        }

        hsFlush()

        if (stackFromBottom) {
            // position = maxPosition - hsPosition - hs.length + 1
            position = hsPosition + hs.length - 1
            offset = clientHeight - hsOffset - down + up

            if (fluidCheck === 3) {
                for (i = hs.length - 1; i >= 0; i--) {
                    if (hs[i].maxHeight) {
                        position--
                        offset += hs[i].height
                    } else break
                }
            } else if (fluidCheck === 2) while (1) {
                position--

                if (position > -1) {
                    h = hsPop(position)
                    offset += h.height
                    hsPush(h)

                    if (!h.maxHeight) break
                } else {
                    //offset = 0
                    break
                }
            }

            // if (position !== maxPosition)
            //     offset -= footerHeight
            // else if (offset > -(lastHeight - footerHeight) / 2)
            //     position = -1
            //
            // if (position === maxPosition && offset > -(lastHeight - footerHeight) / 2)
            //     position = -1

            //console.log('stackFromBottom ->', {hsPosition, hsOffset, position, offset, maxPosition})
        } else {
            position = hsPosition
            offset = hsOffset

            if (fluidCheck === 3) {
                for (h of hs) {
                    if (h.maxHeight) {
                        position++
                        offset += h.height
                    } else break
                }
            } else if (fluidCheck === 2) while (1) {
                position--

                if (position > -1) {
                    h = hsPop(position)
                    offset -= h.height
                    hsPush(h)

                    if (!h.maxHeight) break
                } else {
                    //offset = 0
                    break
                }
            }
        }

        //console.log({hsPosition, hsOffset, position, offset, hsHeight})

        // position = hsPosition
        // offset = hsOffset

        //if (!scrolling && !touching)
        if (!scrolling)
            vm.$emit('laidout', hsPosition, hs)

        win.dispatchEvent(scrolledEvent = new Event('scroll'))
    }

    let scrolled = false,
        scrolling = false,
        scrolledEvent = null,
        scrollStarted = 0,
        scrollEndTimeout,

        touching = false,
        touchTop,
        touchPosition,
        touchOffset,

        keyboard = false,
        keyboardAnchor


    const onResize = () => {
        hsInvalidate(0, itemCount)

        clientHeight = _clientHeight()
        clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
        scrollMax = mmax(0, doc.scrollHeight - clientHeight)

        headerHeight = wrapper.offsetTop - doc.offsetTop
        if (isFixed)
            container.style.width = wrapper.offsetWidth + 'px'
        else
            container.style.top = -headerHeight + 'px'

        const bodyHeight = _bodyHeight()
        footerHeight = bodyHeight - headerHeight - el.offsetHeight

        console.log('resize', {
            clientHeight,
            clientHeightEx,
            scrollMax,
            headerHeight,
            bodyHeight,
            elHeight: el.offsetHeight,
            footerHeight
        })

        update()
    }, onScroll = ev => {
        if (scrolledEvent == ev) {
            scrolledEvent = null
            return
        }

        //console.log('onScroll', ev.type, ev.timeStamp, scrollStarted)

        ev.cancelBubble = true

        if (ev.timeStamp > scrollTime)
            onScrollContinue(ev)

        if (scrollStarted) {
            scrolling = true

            update()
        }
    }, onScrollContinue = ev => {
        //console.log('onScrollContinue', ev?.type)

        if (!scrollStarted)
            scrollStarted = 1

        if (scrollStarted > 0 && ev && (ev.type == 'mousedown' || ev.type == 'touchstart')) {
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
            //touching = false

            console.log('onScrollEnd', ev)

            update()
        }
    }, onTouchStart = ev => {
        //console.log('onTouchStart', ev?.type, allShown)

        if (allShown) {
            onScrollContinue(ev)
            return
        }

        touchTop = doc.scrollTop
        touchPosition = hsPosition
        touchOffset = hsOffset

        //win.addEventListener('touchend', onTouchEnd)
        // just detect touching
        touching = true
    }, onTouchEnd = ev => {
        //console.log('onTouchEnd', ev?.type)

        win.removeEventListener('touchend', onTouchEnd)

        if (touching) {
            touching = false

            update()
        }
    }, onKeyboardFocus = ev => {
        //console.log('onKeyboardFocus', ev.target.nodeName, document.activeElement?.nodeName)//, keyboardAnchor, keyboardAnchor.getBoundingClientRect())

        keyboard = true
        update()
    }, onKeyboardFocusOut = ev => {
        //console.log('onKeyboardFocusOut', ev.target.nodeName, document.activeElement?.nodeName)

        keyboard = false
        update()
    }, onKeyboardBlur = ev => {
        //console.log('onKeyboardBlur', ev.target.nodeName, document.activeElement?.nodeName)

        keyboard = false
        update()
    }

    function created() {
        source = this.source

        _itemCount = source.itemCount
        _getItem = source.getItem

        stackFromBottom = this.stackFromBottom

        itemCount = _itemCount()
        maxPosition = itemCount - 1
    }

    function mounted() {
        el = this.$el
        win = el.closest('.recycler-window') ?? window
        isWindow = win === window
        isFixed = false//isWindow
        doc = isWindow ? document.documentElement : win

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
            addEventListener('focusout', onKeyboardFocusOut, true)
            addEventListener('blur', onKeyboardBlur, true)

            keyboardAnchor = document.createElement('div')
            keyboardAnchor.style.position = 'fixed'
            keyboardAnchor.style.bottom = 0
            keyboardAnchor.style.height = '1px'
            document.body.append(keyboardAnchor)
        }

        onResize()
        //onScrollContinue()
        //win.dispatchEvent(new Event('scroll'))

        win.recycler = this

        loop: for (const type in vm.$slots)
            for (const vnode of vm.$slots[type]) {
                if (!vnode || !vnode.componentOptions)
                    continue;

                ((type, vnode) => {
                    const Ctor = vnode.componentOptions.Ctor,
                        oldOptions = Ctor.options,
                        options = Object.assign({}, oldOptions),
                        dataFn = options.data

                    options.data = function () {
                        const data = dataFn ? dataFn.call(this) : {}
                        // data.type = type
                        // data.source = source
                        // data.item = null
                        data.position = -1
                        return data
                    }

                    options.computed = l_defaults({
                        type: () => type,
                        source: () => source,
                        item() {
                            return _getItem(this.position)
                        }
                    }, oldOptions.computed)

                    delete options.computed.position

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
                })(type, vnode)

                continue loop
            }

        const Vue = this.$root.__proto__.constructor

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
        removeEventListener('focusout', onKeyboardFocusOut, true)
        removeEventListener('blur', onKeyboardBlur, true)

        if (keyboardAnchor) keyboardAnchor.remove()

        scrolling = false
        onScrollEnd()

        win.removeEventListener('touchstart', onTouchStart, true)

        touching = false
        onTouchEnd()

        updateCancel()

        for (const h of hs) hsPush(h)
        hs.length = 0
        hsBinded.length = 0

        for (const key in hsCache) delete hsCache[key]

        firstHeight = 0
        lastHeight = 0
        scrollHeight = 0
    }

    l_mergeWith(this.$options, {created, mounted, beforeDestroy}, (objValue, srcValue) =>
        Array.isArray(objValue) ? objValue.concat([srcValue]) : (objValue ? undefined : [srcValue]))

    this.$options.watch = l_defaults({
        source(newValue) {
            source = newValue

            _itemCount = source.itemCount
            _getItem = source.getItem

            this.onDatasetChanged()
        },
        stackFromBottom(newValue) {
            stackFromBottom = newValue

            this.onDatasetChanged()
        }

    }, this.$options.watch)

    this.$options.methods = l_defaults({
        onDatasetChanged() {
            //console.log('update', {hsPosition, position, _position, count})

            if (hsInvalidate(0, _itemCount())) update()
        },

        onUpdate(_position, count) {
            //console.log('update', {hsPosition, position, _position, count})

            if (hsInvalidate(_position, count)) update()
        },

        onInsert(_position, count) {
            //console.log('insert', {hsPosition, position, _position, count, hsOffset, offset})

            // if (!(stackFromBottom && position == -1) && _position <= position)
            //     position += count

            if (stackFromBottom && position === maxPosition && offset > footerHeight - lastHeight / 2) {
                if (_position <= maxPosition && hs.length > maxPosition && hs[maxPosition].maxHeight) {
                    position = maxPosition + count - 1
                    offset += footerHeight
                }
            } else {
                if (_position <= position) position += count
            }

            for (let i = mmax(0, _position - hsPosition); i < hs.length; i++)
                hs[i].position += count

            if (hsInvalidate(_position, count)) update()
        },

        onRemove(_position, count) {
            //console.log('remove', {hsPosition, position, _position, count})

            const invalid = hsInvalidate(_position, count)

            if (count >= itemCount)
                position = -1
            else if (_position < position)
                position -= mmin(count, position - _position + 1)

            if (invalid) {
                for (let i = mmax(0, _position + count - hsPosition); i < hs.length; i++)
                    hs[i].position -= count

                for (let i = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); i < len; i++) {
                    hsPush(hs[i])
                    hs.splice(i, 1)
                    len--
                    i--
                }

                update()
            }
        },

        update: update,
        updateNow: updateNow,

        position(_position, _offset) {
            if (_position === undefined && _offset === undefined)
                return [position < 0 ? undefined : position, offset]

            position = _position < 0 ? itemCount + _position : _position ?? 0
            offset = stackFromBottom
                ? _offset === undefined ? (position != maxPosition ? footerHeight : 0) : _offset
                //? _offset || 0
                : _offset === undefined ? (position ? headerHeight : 0) : _offset

            console.log('position', {position, offset})

            update()
        },

        startPosition() {
            return hsPosition
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

            const _scrollTop = hsPosition
                ? firstHeight + (doc.scrollTop - scrollMax / maxPosition) / (scrollMax - scrollMax / maxPosition) * (scrollMax - firstHeight)
                : -hsOffset

            //console.log('scrollTop <-', {hsPosition, _scrollTop})

            return _scrollTop
        },

        offset(position) {
            const h = hs[position - hsPosition]
            if (!h) return

            //console.log({t: parseFloat(h.style.top), hsOffset, clientHeight, h: h.height, footerHeight})

            return stackFromBottom
                ? clientHeight - parseFloat(h.style.top) - h.height
                : parseFloat(h.style.top)
        }
    }, this.$options.methods)
}

export default {
    props: {
        source: {
            type: Object,
            required: true
        },
        stackFromBottom: Boolean
    },

    // watch: {
    //     source(newValue, value) {
    //         console.log(newValue, value)
    //     }
    // },

    render(h) {
        return h('div', {
                attrs: {
                    class: 'recycler'
                }
            }, [h('div', {
                attrs: {
                    style: 'position:relative;'
                }
            }, [h('div', {
                attrs: {
                    class: 'recycler-items',
                    style: 'position:relative;overflow:hidden;'
                }
            })])]
        )
    },

    beforeCreate
}
