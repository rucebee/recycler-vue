import _ from 'lodash'
import {animate} from 'robo'

const mmin = Math.min,
    mmax = Math.max,
    mfloor = Math.floor,
    mround = Math.round,
    mabs = Math.abs,
    NEAR_ZERO = .0001,
    NEAR_ONE = 1 - NEAR_ZERO

function Instance(vm, _itemCount, _itemBuilder, _itemTop, stackFromBottom) {
    const win = vm.$el.closest('.recycler-window') ?? window,
        isWindow = win === window,
        doc = isWindow ? document.documentElement : win,

        wrapper = vm.$el.children[0],
        container = wrapper.children[0],

        hs = [],
        hsBinded = [],
        hsCache = {},

        _scroll = top => doc.scrollTo(doc.scrollLeft, top),
        _clientHeight = isWindow ? () => win.innerHeight : () => doc.clientHeight,
        _bodyHeight = () => {
            const EMPTY_DIV = document.createElement('div'),
                ADD_1PX = vm.$el.offsetHeight ? 0 : 1

            EMPTY_DIV.style.height = '1px'
            if (ADD_1PX) vm.$el.style.minHeight = '1px'

            let height = 0
            //let stat
            for (let i = 0; i < doc.childElementCount; i++) {
                const c = doc.children[i],
                    style = c.currentStyle || getComputedStyle(c)

                c.append(EMPTY_DIV)

                const r = c.getBoundingClientRect(),
                    h = r.bottom - doc.offsetTop + doc.scrollTop + (parseInt(style.marginBottom) || 0) - 1 - ADD_1PX

                if (height < h) {
                    height = h
                    //stat = [c, h, r, doc.offsetTop, doc.scrollTop, c.offsetTop, c.offsetHeight]
                }

                EMPTY_DIV.remove()
            }

            if (ADD_1PX) vm.$el.style.minHeight = ''

            //console.log(...stat)

            return height
        }

    win.recycler = vm

    let updateId,

        itemCount = _itemCount(),
        itemBottom = _itemTop(-1),
        maxPosition = itemCount - 1,

        position = -1,
        offset = 0,

        hsPosition = 0,
        hsHeight = 0,
        maxOffset,
        hsOffset,
        allShown = true,

        clientHeight,
        clientHeightEx,
        scrollTop,
        scrollTopMax,
        scrollRatio,
        scrollHeight = 0,
        headerHeight = 0,
        footerHeight = 0,
        lastHeight = 0

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

        let itemBuilder = _itemBuilder(position),
            hsTypeCache = hsCache[itemBuilder.type]

        if (!hsTypeCache)
            hsCache[itemBuilder.type] = hsTypeCache = []

        h = hsTypeCache.pop()
        if (!h) {
            const itemVm = itemBuilder.build()

            itemVm.position = position
            itemVm.$mount()
            itemVm.$emit = (...args) => vm.$emit.apply(vm, args)
            itemVm._watcher.active = false

            h = {
                vm: itemVm,
                type: itemBuilder.type,
                view: itemVm.$el,
                style: itemVm.$el.style
            }

            const style = h.style
            style.position = 'absolute'
            style.left = 0
            style.right = 0
            style.marginTop = 0
            style.marginBottom = 0

            container.append(h.view)

            const computedStyle = h.view.currentStyle || getComputedStyle(h.view)
            if (computedStyle.maxHeight.endsWith('%')) {
                h.maxHeight = (parseInt(computedStyle.maxHeight) || 0) / 100
                h.minHeight = (parseInt(computedStyle.minHeight) || h.view.offsetHeight)

                style.maxHeight = 'initial'
                style.minHeight = 'initial'
            }

            //console.log('create', position)
        } else {
            container.append(h.view)

            //h.style.display = ''

            h.vm.position = -1
            h.vm.position = position
            h.vm._update(h.vm._render(), false)

            //console.log('bind', position, h.vm.source)
        }

        h.position = position
        h.top = _itemTop(position)
        if (!position) h.top += headerHeight

        if (h.maxHeight > 0) {
            h.height = mmax(h.minHeight, h.maxHeight * clientHeight)
                + h.top + (position == maxPosition ? itemBottom : 0)

            //Doing it later:
            //h.style.height = h.height + 'px'
        } else {
            h.height = h.view.offsetHeight + h.top

            if (position == maxPosition)
                h.height += itemBottom
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

        h.view.remove()
        //h.style.display = 'none'

        hsTypeCache.push(h)
    }

    function hsFlush() {
        for (let i in hsBinded) {
            hsBinded[i].height = 0
            hsPush(hsBinded[i])
        }

        hsBinded.length = 0
    }

    function hsInvalidate(_position, count) {
        if (hsPosition >= itemCount) {
            lastHeight = 0

            for (let h of hs) h.height = 0

            return true
        }

        if (!count) return true

        if (_position >= hsPosition && _position <= hsPosition + hs.length
            || hsPosition >= _position && hsPosition <= _position + count) {

            if (_position + count >= itemCount)
                lastHeight = 0

            for (let i = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); i < len; i++)
                hs[i].height = 0

            return true
        }

        if (_position + count >= itemCount && lastHeight) {
            lastHeight = 0

            return true
        }
    }

    function calcScrollHeight() {
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

        if (scrollHeight != height) {
            scrollHeight = height

            wrapper.style.height = (scrollHeight - headerHeight - footerHeight) + 'px'
            container.style.height = (scrollHeight - footerHeight) + 'px'

            // clientHeight = _clientHeight()
            // clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
            scrollTopMax = mmax(0, doc.scrollHeight - clientHeight)

            // console.log('scrollHeight', {
            //     scrollHeight,
            //     _scrollHeight: doc.scrollHeight,
            //     clientHeight,
            //     scrollTopMax
            // })
        }
    }

    function _scrollRatio() {
        // function calc(position, offset, hheight) {
        //     //hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height
        //     return ((/*<scrollRatio>*/(offset - /*<position>*/position/*</position>*/ * hheight) / (maxOffset - maxPosition * hheight)/*</scrollRatio>*/) * maxOffset - offset) / hheight
        // }

        if (!maxPosition)
            return hsOffset / maxOffset

        let startPositionReal = itemCount > hs.length ? hsPosition + (hs.length - 1) * hsPosition / (itemCount - hs.length) : 0,
            _position = mfloor(startPositionReal),
            _offset = hsOffset,
            offsetRatio = 0,
            hh

        const i = _position - hsPosition
        for (let j = 0; j < i; j++)
            _offset += hs[j].height

        // const stat = {
        //     ratios: [],
        //     startPosition: _position
        // }

        hh = hs[i].height
        offsetRatio = ((/*<scrollRatio>*/(_offset - /*<position>*/position/*</position>*/ * hh) / (maxOffset - maxPosition * hh)/*</scrollRatio>*/) * maxOffset - _offset) / hh
        // stat.ratios[i] = {
        //     position: _position,
        //     offset: _offset,
        //     hheight: hs[i].height,
        //     offsetRatio
        // }

        let j = i
        if (offsetRatio > 1) {
            while (++j < hs.length) {
                _offset += hs[j - 1].height

                hh = hs[j].height
                let _offsetRatio = ((/*<scrollRatio>*/(_offset - /*<position>*/hsPosition + j/*</position>*/ * hh) / (maxOffset - maxPosition * hh)/*</scrollRatio>*/) * maxOffset - _offset) / hh
                // stat.ratios[j] = {
                //     position: hsPosition + j,
                //     offset: _offset,
                //     hheight: hs[j].height,
                //     offsetRatio: _offsetRatio
                // }

                if (_offsetRatio > -NEAR_ZERO && _offsetRatio < 1) {
                    offsetRatio = _offsetRatio
                    _position = hsPosition + j
                    break
                }
            }
        } else if (offsetRatio < -NEAR_ZERO) {
            while (--j >= 0) {
                _offset -= hs[j].height

                hh = hs[j].height
                let _offsetRatio = ((/*<scrollRatio>*/(_offset - /*<position>*/hsPosition + j/*</position>*/ * hh) / (maxOffset - maxPosition * hh)/*</scrollRatio>*/) * maxOffset - _offset) / hh
                // stat.ratios[j] = {
                //     position: hsPosition + j,
                //     offset: _offset,
                //     hheight: hs[j].height,
                //     offsetRatio: _offsetRatio
                // }

                if (_offsetRatio > -NEAR_ZERO && _offsetRatio < 1) {
                    offsetRatio = _offsetRatio
                    _position = hsPosition + j
                    break
                }
            }
        }

        // for (const index in stat.ratios) {
        //     const ratio = stat.ratios[index]
        //     ratio.delta = scrollTopMax * ratio.real / maxPosition - scrollTop
        // }
        // stat.info = {
        //     position: _position,
        //     startPositionReal,
        //     offsetRatio,
        //     range: [hsPosition, hsPosition + hs.length - 1, maxPosition].join(' / ')
        // }
        // console.log(stat.info, stat.ratios)

        return mmax(0, mmin(maxPosition, _position + offsetRatio)) / maxPosition
    }

    function updateFrame() {
        itemCount = _itemCount()
        maxPosition = itemCount - 1
        itemBottom = _itemTop(-1) + footerHeight

        while (hs.length) hsPush(hs.pop())

        if (!itemCount) {
            hsFlush()

            vm.$emit('laidout', 0, hs, scrollEvent || touching)

            if (scrollEvent && !scrollEvent.target)
                win.dispatchEvent(scrollEvent)

            return
        }

        let h, up, down, i

        if (!lastHeight) {
            h = hsPop(maxPosition)
            lastHeight = h.height
            hsPush(h)
        }

        maxOffset = clientHeight - lastHeight

        scrollTop = doc.scrollTop

        if (scrollEvent) {
            scrollRatio = mmax(0, mmin(1, scrollTopMax > 0 ? scrollTop / scrollTopMax : 0))

            const positionReal = maxPosition * scrollRatio

            hs.push(h = hsPop(hsPosition = mfloor(positionReal)))

            hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height

            //console.log({hsOffset, hsPosition, hheight: h.height, positionReal, scrollRatio})
            //console.log('scroll', scrollTop, scrollTopMax, scrollRatio, positionReal)
        } else {
            if (stackFromBottom) {
                if (position > maxPosition) {
                    hsPosition = 0
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = 0
                } else {
                    hsPosition = maxPosition - mmax(0, position)
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = clientHeight - offset - h.height

                    //console.log(hsPosition, hsOffset, '<-', position, _offset)
                }
            } else {
                if (position > maxPosition) {
                    hsPosition = maxPosition
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = 0
                } else {
                    hsPosition = mmax(0, position)
                    hs.push(h = hsPop(hsPosition))

                    hsOffset = offset
                }
            }
        }

        up = scrollTop + hsOffset
        down = up + h.height

        i = hsPosition
        while (i-- > 0 && up > scrollTop) {
            hs.unshift(h = hsPop(i))
            up -= h.height
            hsOffset -= h.height
        }

        i = hsPosition
        if (hs.length > 1) hsPosition -= hs.length - 1

        hsHeight = down - up

        while (++i < itemCount && (down < scrollTop + clientHeight || hsHeight < clientHeightEx)) {
            hs.push(h = hsPop(i))
            down += h.height
            hsHeight += h.height
        }

        let bottomSpace = scrollTop + clientHeight - down
        if (bottomSpace > 0) {
            up += bottomSpace

            i = hsPosition;
            while (i-- > 0 && up > scrollTop) {
                hs.unshift(h = hsPop(i))
                up -= h.height
                hsOffset -= h.height
                hsHeight += h.height
                hsPosition--
            }
        }

        allShown = hs.length == itemCount && hsHeight < clientHeightEx + 1
        if (allShown) {
            up = 0

            if (!scrollEvent) {
                calcScrollHeight()

                if (Math.abs(hsOffset - scrollTop) >= 1) {
                    _scroll(scrollTop = -hsOffset)
                }
            } else {
                hsOffset = -mround(scrollTopMax * hsOffset / (clientHeight - hsHeight))
            }
        } else {
            hsOffset = up - scrollTop

            if (hsPosition == 0 && hsOffset > 0) {
                hsOffset = 0
                up = 0

                if (!scrollEvent) {
                    calcScrollHeight()

                    _scroll(scrollTop = 0)
                    scrollRatio = 0
                }
            } else if (!scrollEvent) {
                calcScrollHeight()

                const newScrollTop = scrollTopMax * _scrollRatio()
                if (Math.abs(newScrollTop - scrollTop) >= 1) {
                    up += newScrollTop - scrollTop

                    // console.log('adjustScroll', {
                    //     delta: newScrollTop - scrollTop,
                    //     scrollTop
                    // })

                    _scroll(scrollTop = newScrollTop)
                }
            }
        }

        if (stackFromBottom && scrollHeight < clientHeight)
            up += clientHeight - scrollHeight

        down = up

        let j = 0, fluidCheck = 0
        while (j < hs.length) {
            h = hs[j];
            //h.style.zIndex = j
            //h.style.order = j

            if (h.maxHeight) {
                let top = down, height = h.height - h.top

                if (hsPosition + j == maxPosition)
                    height -= itemBottom

                if (!allShown) {
                    if (j == 0 && down + h.top < scrollTop) {
                        top = down + mmin(height - h.minHeight, scrollTop - down - h.top)
                        height -= (top) - down
                    }

                    if (j == hs.length - 1 && down + height > scrollTop + clientHeight)
                        height = mmax(h.minHeight, scrollTop + clientHeight - down)
                }

                h.style.top = (top + h.top) + 'px'
                h.style.height = height + 'px'

                fluidCheck = fluidCheck | 2
            } else {
                h.style.top = down + h.top + 'px'
                fluidCheck = fluidCheck | 1
            }

            down += h.height
            j++
        }

        hsFlush()

        if (stackFromBottom) {
            position = maxPosition - hsPosition - hs.length + 1
            offset = clientHeight - hsOffset - down + up

            if (fluidCheck == 3) {
                for (i = hs.length - 1; i >= 0; i--) {
                    if (hs[i].maxHeight) {
                        position++
                        offset += hs[i].height
                    } else break
                }
            } else if (fluidCheck == 2) while (1) {
                position++

                if (position < itemCount) {
                    h = hsPop(position)
                    offset += h.height
                    hsPush(h)

                    if (!h.maxHeight) break
                } else {
                    position = -1
                    //offset = 0
                    break
                }
            }

            //console.log(hsPosition, hsOffset, '->', position, offset)
        } else {
            position = hsPosition
            offset = hsOffset

            if (fluidCheck == 3) {
                for (h of hs) {
                    if (h.maxHeight) {
                        position++
                        offset += h.height
                    } else break
                }
            } else if (fluidCheck == 2) while (1) {
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

        vm.$emit('laidout', hsPosition, hs, scrollEvent || touching)

        if (scrollEvent && !scrollEvent.target)
            win.dispatchEvent(scrollEvent)
    }

    let addressBarHeight = 0,
        scrollEvent = null,
        scrollAnim,
        scrollStarted = 0,
        scrollEndTimeout

    const onResize = () => {
        if (isWindow) {
            const _addressBarHeight = innerHeight - doc.clientHeight
            if (_addressBarHeight)
                addressBarHeight = _addressBarHeight
        }

        hsInvalidate(0, itemCount)

        clientHeight = _clientHeight()
        clientHeightEx = mmax(parseInt(doc.style.minHeight) || 0, clientHeight)
        scrollTopMax = mmax(0, doc.scrollHeight - clientHeight)

        headerHeight = wrapper.offsetTop - doc.offsetTop
        container.style.top = -headerHeight + 'px'

        const bodyHeight = _bodyHeight()
        footerHeight = bodyHeight - headerHeight - vm.$el.offsetHeight

        // console.log('resize', {
        //     clientHeight,
        //     clientHeightEx,
        //     scrollTopMax,
        //     headerHeight,
        //     bodyHeight,
        //     elHeight: vm.$el.offsetHeight,
        //     footerHeight
        // })

        update()
    }, onScroll = ev => {
        if (scrollEvent == ev) return

        //console.log('onScroll', ev?.type, scrollStarted)

        if (!scrollStarted) {
            if (!touching) {
                //console.log('onScroll cancelBubble')

                ev.cancelBubble = true
            }

            return
        }

        scrollEvent = new Event('scroll')
        //onScrollContinue()

        update()
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
            scrollEndTimeout = setTimeout(onScrollEnd, 200)
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

        if (scrollEvent) {
            scrollEvent = false

            update()
        }
    }

    let touching,
        touchY, touchDeltaY,
        touchVelTime, touchVelY, touchVel,
        touchReleaseTimeout,
        prevOverflow

    const onTouchStart = ev => {
        //console.log('onTouchStart', ev?.type, allShown)

        if (allShown) {
            onScrollContinue(ev)
            return
        }

        onTouchRelease()
        prevOverflow = doc.style.overflowY
        doc.style.overflowY = 'hidden'

        if (scrollAnim) {
            scrollAnim.stop()
            scrollAnim = null
        }

        touchY = ev.touches[0].clientY
        touchVelY = touchY

        touchVelTime = Date.now()
        touchVel = []

        //console.log('touch.start', touchY)

        win.addEventListener('touchmove', onTouchMove, true)
        if (!isWindow)
            win.addEventListener('touchmove', onTouchGlobalMove, {capture: true, passive: false})
        win.addEventListener('touchend', onTouchEnd)

        touching = true
    }, onTouchMove = ev => {
        touchDeltaY = ev.touches[0].clientY - touchY

        if (isWindow && (innerHeight != doc.clientHeight) == (touchDeltaY > 0)) {
            if (addressBarHeight) {
                let _touchDeltaY = 0

                if (touchDeltaY > addressBarHeight + 1) {
                    _touchDeltaY = touchDeltaY - addressBarHeight
                } else if (-touchDeltaY > addressBarHeight + 1) {
                    _touchDeltaY = touchDeltaY + addressBarHeight
                }

                if (_touchDeltaY) {
                    //console.log({addressBarHeight, touchDeltaY, _touchDeltaY})

                    touchY += _touchDeltaY
                    vm.scrollBy(_touchDeltaY)
                }
            }
        } else if (mabs(touchDeltaY) > 1) {
            touchY = ev.touches[0].clientY
            vm.scrollBy(touchDeltaY)
        }

        const time = Date.now()
        touchVel.push(mabs((ev.touches[0].clientY - touchVelY) / (time - touchVelTime)))
        if (touchVel.length > 5)
            touchVel.splice(0, touchVel.length - 5)
        touchVelTime = time
        touchVelY = ev.touches[0].clientY
    }, onTouchEnd = ev => {
        //console.log('onTouchEnd', ev?.type)

        if (touchVel.length > 0) {
            const vel = mmax(...touchVel)
            if (vel > 1)
                vm.scrollBy(touchDeltaY > 0 ? .1 : -.1)
        }

        clearTouchEvents()
        touchReleaseTimeout = setTimeout(onTouchRelease, 1000)

        update()
    }, onTouchGlobalMove = ev => {
        //console.log('onTouchGlobalMove')

        if (ev.cancelable)
            ev.preventDefault()
    }, onTouchRelease = () => {
        if (touchReleaseTimeout) {
            clearTimeout(touchReleaseTimeout)
            touchReleaseTimeout = 0

            doc.style.overflowY = prevOverflow
        }
    }, clearTouchEvents = () => {
        touching = false

        win.removeEventListener('touchmove', onTouchMove, true)
        if (!isWindow)
            win.removeEventListener('touchmove', onTouchGlobalMove, false)
        win.removeEventListener('touchend', onTouchEnd)

        if (touchReleaseTimeout) {
            clearTimeout(touchReleaseTimeout)
            touchReleaseTimeout = 0
        }
    }

    addEventListener('resize', onResize)
    win.addEventListener('scroll', onScroll, true)
    win.addEventListener('wheel', onScrollContinue, true)
    win.addEventListener('mousewheel', onScrollContinue, true)
    win.addEventListener('mousedown', onScrollContinue, true)

    win.addEventListener('touchstart', onTouchStart, true)

    onResize()

    win.recycler = vm

    this.destroy = () => {
        if (win.recycler === vm)
            delete win.recycler

        if (scrollAnim) {
            scrollAnim.stop()
            scrollAnim = null
        }

        removeEventListener('resize', onResize)

        win.removeEventListener('scroll', onScroll, true)
        win.removeEventListener('wheel', onScrollContinue, true)
        win.removeEventListener('mousewheel', onScrollContinue, true)
        win.removeEventListener('mousedown', onScrollContinue, true)

        scrollEvent = null
        onScrollEnd()

        win.removeEventListener('touchstart', onTouchStart, true)

        onTouchRelease()
        clearTouchEvents()

        updateCancel()

        for (const h of hs) hsPush(h)
        hs.length = 0
        hsBinded.length = 0

        for (const key in hsCache) delete hsCache[key]

        lastHeight = 0
        scrollHeight = 0
    }

    _.assign(vm, {
        onDatasetChanged() {
            //console.log('update', hsPosition, position, _position, count)

            if (hsInvalidate(0, _itemCount())) update()
        },

        onUpdate(_position, count) {
            //console.log('update', hsPosition, position, _position, count)

            if (hsInvalidate(_position, count)) update()
        },

        onInsert(_position, count) {
            //console.log('insert', hsPosition, position, _position, count)

            if (_position <= position)
                position += count

            for (let i = mmax(0, _position - hsPosition); i < hs.length; i++)
                hs[i].position += count

            if (hsInvalidate(_position, count)) update()
        },

        onRemove(_position, count) {
            //console.log('remove', hsPosition, position, _position, count)

            const invalid = hsInvalidate(_position, count)

            if (_position < position)
                position -= mmin(count, position - _position + 1)

            for (let i = mmax(0, _position + count - hsPosition); i < hs.length; i++)
                hs[i].position -= count

            if (invalid) update()
        },

        update: update,

        position(_position, _offset) {
            if (_position === undefined && _offset === undefined)
                return [position < 0 ? undefined : position, offset]

            if (scrollAnim) {
                scrollAnim.stop()
                scrollAnim = null
            }

            position = _position < 0 ? itemCount + _position : _position ?? 0
            offset = _offset === undefined ? 0 : _offset

            //console.log('position', {position, offset})

            update()
        },

        scrollTop: () => hsPosition ? doc.scrollTop : -offset,

        scrollBy(delta) {
            if (scrollAnim) {
                scrollAnim.stop()
                scrollAnim = null
            }

            if (mabs(delta) > 1) {
                //console.log('scrollBy', delta)

                offset += stackFromBottom ? -delta : delta

                //console.log('scrollBy', offset)

                update()
            } else if (delta) {
                updateNow()

                let scrollDelta = (delta > 0 ? 1 : -1) * mmax(scrollTopMax * mabs(delta), clientHeight)
                const baseScrollTop = doc.scrollTop
                if (baseScrollTop - scrollDelta < 0)
                    scrollDelta = baseScrollTop
                else if (baseScrollTop - scrollDelta > scrollTopMax)
                    scrollDelta = baseScrollTop - scrollTopMax

                //console.log('scrollBy', delta, baseScrollTop, scrollDelta)

                if (scrollDelta) {
                    scrollAnim = animate(
                        process => {
                            onScrollContinue()

                            _scroll(baseScrollTop - process * scrollDelta)
                        },
                        mmax(500, mmin(2000, 400 * mabs(scrollDelta) / clientHeight)),
                        t => t * (2 - t)
                    )
                }
            }
        }
    })
}

export default {
    name: 'Recycler',

    Builder(Vue, component, propsData) {
        const Component = Vue.extend(component),
            data = component.data?.() ?? {},
            dataFn = () => _.assign({position: undefined}, data)

        this.type = component.name
        this.build = () => new Component({
            data: dataFn,
            propsData: propsData
        })
    },

    data() {
        return {}
    },

    props: {
        itemCount: {
            type: Function,
            required: true
        },
        itemBuilder: {
            type: Function,
            required: true
        },
        stackFromBottom: Boolean,
        itemTop: {
            type: Function,
            default: () => 0
        }
    },

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

    mounted() {
        this._instance = new Instance(this, this.itemCount, this.itemBuilder, this.itemTop, this.stackFromBottom)
    },

    beforeDestroy() {
        this._instance.destroy()
    }
}
