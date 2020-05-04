import _ from 'lodash'

const mmin = Math.min,
    mmax = Math.max,
    mfloor = Math.floor,
    mround = Math.round,
    mabs = Math.abs,
    NEAR_ZERO = .0001,
    NEAR_ONE = 1 - NEAR_ZERO

function animate(draw, duration, timing = timeFraction => timeFraction) {
    let start = performance.now(),
        animateId = requestAnimationFrame(function animate(time) {
            let timeFraction = (time - start) / duration
            if (timeFraction > 1) timeFraction = 1

            let progress = timing(timeFraction)

            draw(progress)

            if (timeFraction < 1) {
                animateId = requestAnimationFrame(animate)
            } else {
                animateId = 0
            }
        })

    return () => {
        if (animateId) {
            cancelAnimationFrame(animateId)
            animateId = 0
        }
    }
}

export default function (Vue) {
    const hs = [],
        hsCache = {},
        hsBindedCache = [],
        BASE_NODE = document.createElement('div')

    let thisVm,
        isWindow,
        updateId,

        itemCount,
        itemBottom,
        maxPosition,

        _itemCount,
        _itemView,
        _itemTop,
        stackFromBottom,

        win,
        doc,
        wrapper,
        container,

        position = -1,
        offset = 0,

        hsPosition = 0,
        hsHeight = 0,
        maxOffset,
        hsOffset,

        _clientHeight,
        clientHeight,
        scrollTop = 0,
        scrollTopMax,
        scrollRatio,
        scrollHeight = 0,
        headerHeight = 0,
        footerHeight = 0,
        lastHeight = 0,

        clueRatio, cluePosition,

        _scroll,
        skipScroll = false

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

        if (hsBindedCache[position]) {
            h = hsBindedCache[position]
            delete hsBindedCache[position]

            //console.log('binded', position)

            return h
        }

        let itemView = _itemView(position),
            hsTypeCache = hsCache[itemView.type]

        if (!hsTypeCache)
            hsCache[itemView.type] = hsTypeCache = []

        h = hsTypeCache.pop()
        if (!h) {
            const data = itemView.data ? itemView.data() : {}
            data.position = position
            data.eventBus = thisVm

            h = {
                vm: new Vue({
                    el: BASE_NODE.cloneNode(true),
                    render: h => h(_.assign({}, itemView, {
                        data: () => data
                    }))
                }).$children[0],
                type: itemView.type
            }

            h.vm._watcher.active = false

            h.view = h.vm.$el
            h.style = h.view.style

            const style = h.style
            style.position = 'absolute'
            style.left = 0
            style.right = 0
            style.marginTop = 0
            style.marginBottom = 0

            container.appendChild(h.view)

            const cs = getComputedStyle(h.view, null)
            if (cs.getPropertyValue('max-height').endsWith('%')) {
                h.maxHeight = (parseInt(cs.getPropertyValue('max-height')) || 0) / 100
                h.minHeight = (parseInt(cs.getPropertyValue('min-height')) || 0)

                style.maxHeight = 'initial'
                style.minHeight = 'initial'
                if (!h.minHeight)
                    h.minHeight = h.view.offsetHeight
            }

            //console.log('create', position)
        } else {
            container.appendChild(h.view)

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
            hsBindedCache[h.position] = h

            return
        }

        let type = h.type,
            hsTypeCache = hsCache[type]

        container.removeChild(h.view)
        //h.style.display = 'none'

        hsTypeCache.push(h)
    }

    function hsFlush() {
        for (let i in hsBindedCache) {
            hsBindedCache[i].height = 0
            hsPush(hsBindedCache[i])
        }

        hsBindedCache.length = 0
    }

    function hsInvalidate(_position, count) {
        if (hsPosition >= itemCount) {
            lastHeight = 0

            for (let h of hs) h.height = 0

            return true
        }

        if (!count) {
            lastHeight = 0

            return true
        }

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

    function updateScrollHeight() {
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
            //console.log('scrollHeight', scrollHeight, height)
            scrollHeight = height

            wrapper.style.height = (scrollHeight - headerHeight - footerHeight) + 'px'
            clientHeight = _clientHeight()
            scrollTopMax = mmax(0, scrollHeight - clientHeight)

            // console.log({
            //     clientHeight, scrollTopMax, scrollHeight,
            //     _clientHeight: _clientHeight(),
            //     _scrollHeight: doc.scrollHeight,
            //     _offsetHeight: doc.offsetHeight
            // })
        }
    }

    function adjustPosition() {
        let startPositionReal = itemCount > hs.length ? hsPosition + (hs.length - 1) * hsPosition / (itemCount - hs.length) : 0,
            _position = mfloor(startPositionReal),
            _offset = hsOffset,
            offsetRatio = 0

        const i = _position - hsPosition
        for (let j = 0; j < i; j++)
            _offset += hs[j].height

        // const stats = {
        //     ratios: [],
        //     startPosition: _position
        // }

        const A = maxOffset / maxPosition

        offsetRatio = (A * _position - _offset) / hs[i].height - .5
        //stats.ratios[i] = {position: _position, offsetRatio: offsetRatio}

        if (_position != maxPosition || offsetRatio <= -.5 - NEAR_ZERO) {
            let j = i

            if (offsetRatio > 0) {
                while (++j < hs.length) {
                    _offset += hs[j - 1].height

                    let _offsetRatio = (A * (hsPosition + j) - _offset) / hs[j].height - .5
                    //stats.ratios[j] = {position: hsPosition + j, offsetRatio: _offsetRatio}

                    if (mabs(_offsetRatio) < mabs(offsetRatio)) {
                        offsetRatio = _offsetRatio
                        _position = hsPosition + j
                    }//else break //Do not break
                }
            } else {
                while (--j >= 0) {
                    _offset -= hs[j].height

                    let _offsetRatio = (A * (hsPosition + j) - _offset) / hs[j].height - .5
                    //stats.ratios[j] = {position: hsPosition + j, offsetRatio: _offsetRatio}

                    if (mabs(_offsetRatio) < mabs(offsetRatio)) {
                        offsetRatio = _offsetRatio
                        _position = hsPosition + j
                    }//else break //Do not break
                }
            }
        }

        // for (const index in stats.ratios) {
        //     const ratio = stats.ratios[index]
        //     ratio.real = mmax(0, mmin(maxPosition, ratio.position + ratio.offsetRatio + .5))
        //     ratio.delta = scrollTopMax * ratio.real / maxPosition - scrollTop
        // }
        // stats.info = {
        //     position: _position,
        //     offsetRatio: offsetRatio,
        //     range: [hsPosition, hsPosition + hs.length - 1, maxPosition].join(' / ')
        // }
        // console.log(stats.info, stats.ratios)

        return mmax(0, mmin(maxPosition, _position + offsetRatio + .5))
    }

    function updateFrame() {
        itemCount = _itemCount()
        maxPosition = itemCount - 1
        itemBottom = _itemTop(-1) + footerHeight

        while (hs.length) hsPush(hs.pop())

        if (!itemCount) {
            hsFlush()

            thisVm.$emit('laidout', 0, hs, 0)

            return
        }

        let h, up, down, i

        if (!lastHeight) {
            h = hsPop(maxPosition)
            lastHeight = h.height
            hsPush(h)
        }

        maxOffset = clientHeight - lastHeight

        if (scrolling) {
            scrollTop = doc.scrollTop
            scrollRatio = mmax(0, mmin(1, scrollTopMax > 0 ? scrollTop / scrollTopMax : 0))

            const positionReal = scrollStarted ? (
                mmin(maxPosition, scrollRatio < clueRatio ?
                    (clueRatio < NEAR_ZERO ? 0 : cluePosition * scrollRatio / clueRatio) :
                    maxPosition - (clueRatio > NEAR_ONE ? 0 : (maxPosition - cluePosition) * (1 - scrollRatio) / (1 - clueRatio))
                )
            ) : maxPosition * scrollRatio

            hs.push(h = hsPop(hsPosition = mfloor(positionReal)))

            hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height

            clueRatio = scrollRatio;
            cluePosition = positionReal

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

                    //console.log(hsPosition, hsOffset, '<-', position, offset)
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
        }

        i = hsPosition

        if (hs.length > 1)
            hsPosition -= hs.length - 1

        while (++i < itemCount && down < scrollTop + clientHeight) {
            hs.push(h = hsPop(i))
            down += h.height
        }

        hsHeight = down - up

        let bottomSpace = scrollTop + clientHeight - down
        if (bottomSpace > 0) {
            up += bottomSpace

            i = hsPosition;
            while (i-- > 0 && up > scrollTop) {
                hs.unshift(h = hsPop(i))
                up -= h.height
                hsHeight += h.height
                hsPosition--
            }
        }

        hsOffset = up - scrollTop

        if (maxPosition == 0 || hsPosition == 0 && hsOffset > 0) {
            hsOffset = 0
            up = 0

            if (!scrolling) {
                updateScrollHeight()

                skipScroll = true
                _scroll(scrollTop = 0)
                scrollRatio = 0
            }
        } else if (!scrolling) {
            updateScrollHeight()

            const positionReal = adjustPosition(),
                newScrollTop = scrollTopMax * positionReal / maxPosition

            if (Math.abs(newScrollTop - scrollTop) >= 1) {
                up += newScrollTop - scrollTop

                //console.log('adjustPosition', positionReal, newScrollTop - scrollTop)

                skipScroll = true
                _scroll(scrollTop = newScrollTop)
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

                if (j == 0 && down < scrollTop) {
                    top = down + mmin(height - h.minHeight, scrollTop - down)
                    height -= top - down
                }

                if (j == hs.length - 1 && down + height > scrollTop + clientHeight)
                    height = mmax(h.minHeight, scrollTop + clientHeight - down)

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
                    offset = 0
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
                    offset = 0
                    break
                }
            }
        }

        thisVm.$emit('laidout', hsPosition, hs, touching || scrolling ? scrollTime : 0)
    }

    let scrolling,
        scrollingStop,
        scrollStarted = false,
        scrollFinishTimeout,
        scrollTime = -1

    const onResize = () => {
        for (let h of hs) h.height = 0

        //console.log('resize', clientHeight, _clientHeight(), doc.offsetHeight)

        clientHeight = _clientHeight()
        scrollTopMax = mmax(0, doc.scrollHeight - clientHeight)

        headerHeight = wrapper.offsetTop
        container.style.top = -headerHeight + 'px'

        footerHeight = (doc.offsetHeight < _clientHeight()
            ? doc.offsetHeight : doc.scrollHeight) - headerHeight - thisVm.$el.offsetHeight

        // console.log({
        //     clientHeight, scrollTopMax, scrollHeight, headerHeight, footerHeight,
        //     _clientHeight: _clientHeight(),
        //     _scrollHeight: doc.scrollHeight,
        //     _offsetHeight: doc.offsetHeight
        // })

        update()
    }, onScroll = () => {
        if (skipScroll) {
            skipScroll = false
            return
        }

        if (!scrolling) {
            scrolling = true

            console.log('scrollStart', scrollStarted)

            clueRatio = itemCount ? scrollRatio : 0
            cluePosition = maxPosition * clueRatio

            if (!scrollStarted) {
                win.addEventListener('mousemove', onScrollContinue)
                win.addEventListener('wheel', onScrollContinue)

                onScrollContinue()
            }
        }

        if (!scrollStarted)
            scrollTime = Date.now()

        if (scrollFinishTimeout) {
            clearTimeout(scrollFinishTimeout)
            scrollFinishTimeout = setTimeout(onScrollFinish, 300)
        }

        // scrollTop = doc.scrollTop
        // scrollRatio = mmax(0, mmin(1, scrollTopMax > 0 ? scrollTop / scrollTopMax : 0))

        //console.log('scroll', scrollTop, scrollTopMax, scrollRatio)

        update()
    }, onScrollStart = () => {
        scrollStarted = true

        scrollTime = -1
    }, onScrollContinue = () => {
        if (scrollFinishTimeout)
            clearTimeout(scrollFinishTimeout)
        scrollFinishTimeout = setTimeout(onScrollFinish, 100)
    }, onScrollFinish = () => {
        scrollStarted = false

        if (scrollFinishTimeout) {
            clearTimeout(scrollFinishTimeout)
            scrollFinishTimeout = 0
        }

        if (scrolling) {
            //console.log('scrollFinish', scrollTop, scrollTopMax, scrollRatio)

            clearScrollEvents()

            update()
        }
    }, clearScrollEvents = () => {
        scrolling = false

        win.removeEventListener('mousemove', onScrollContinue)
        win.removeEventListener('wheel', onScrollContinue)
    }

    let touching,
        touchY, touchDeltaY,
        touchTime, touchVel

    const onTouchStart = ev => {
        if (scrollingStop) {
            scrollingStop()
            scrollingStop = null
        }

        doc.style.overflowY = 'hidden'
        touchY = ev.touches[0].clientY

        touchTime = Date.now()
        touchVel = []

        //console.log('touch.start', touchY)

        win.addEventListener('touchmove', onTouchMove)
        if (doc != document.documentElement)
            window.addEventListener('touchmove', onTouchWindowMove, {passive: false})
        win.addEventListener('touchend', onTouchEnd)

        touching = true
    }, onTouchMove = ev => {
        touchDeltaY = ev.touches[0].clientY - touchY

        if (isWindow && (window.innerHeight != doc.clientHeight) == (touchDeltaY > 0)) {
            touchY = ev.touches[0].clientY

            touchTime = Date.now()
            touchVel = []
        } else {
            touchY = ev.touches[0].clientY
            thisVm.scroll(touchDeltaY)

            const time = Date.now()
            touchVel.push(mabs(touchDeltaY / (time - touchTime)))
            if (touchVel.length > 5)
                touchVel.splice(0, touchVel.length - 5)
            touchTime = time
        }
    }, onTouchEnd = ev => {
        if (touchVel.length > 0) {
            const vel = mmax(...touchVel)
            if (vel > 1)
                thisVm.scroll(touchDeltaY > 0 ? .1 : -.1)
        }

        clearTouchEvents()

        //console.log('touch.end')
    }, onTouchWindowMove = ev => {
        //console.log('touch.window.move')

        if (ev.cancelable)
            ev.preventDefault()
    }, clearTouchEvents = () => {
        touching = false

        doc.style.overflowY = 'auto'

        win.removeEventListener('touchmove', onTouchMove)
        if (!isWindow)
            window.removeEventListener('touchmove', onTouchWindowMove)
        win.removeEventListener('touchend', onTouchEnd)
    }

    return {
        name: 'Recycler',
        props: {
            itemCount: {
                type: Function,
                required: true
            },
            itemView: {
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
                        style: 'position:relative;overflow:hidden;'
                    }
                }, [h('div', {
                    attrs: {
                        class: 'recycler-items',
                        style: 'position:relative;'
                    }
                })])]
            )
        },
        methods: {
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

            nav(_position, _offset) {
                if (scrollingStop) {
                    scrollingStop()
                    scrollingStop = null
                }

                position = _position < 0 ? itemCount + _position : _position || 0
                offset = _offset === undefined ? 0 : _offset

                //console.log('nav', position, offset)

                update()
            },
            scroll(delta) {
                if (scrollingStop) {
                    scrollingStop()
                    scrollingStop = null
                }

                if (mabs(delta) > 1) {
                    console.log('delta', delta)

                    offset += stackFromBottom ? -delta : delta

                    update()
                } else if (delta) {
                    updateNow()
                    skipScroll = false

                    let scrollDelta = (delta > 0 ? 1 : -1) * mmax(scrollTopMax * mabs(delta), clientHeight)
                    const baseScrollTop = scrollTop
                    if (baseScrollTop - scrollDelta < 0)
                        scrollDelta = baseScrollTop
                    else if (baseScrollTop - scrollDelta > scrollTopMax)
                        scrollDelta = baseScrollTop - scrollTopMax

                    console.log('delta', delta, scrollDelta)

                    if (scrollDelta) scrollingStop = animate(process => {
                        _scroll(baseScrollTop - process * scrollDelta)
                    }, mmax(500, mmin(2000, 400 * mabs(scrollDelta) / clientHeight)))
                }
            }
        },
        beforeMount() {
            thisVm = this

            _itemCount = thisVm.itemCount
            _itemView = thisVm.itemView
            _itemTop = thisVm.itemTop
            stackFromBottom = thisVm.stackFromBottom
        },
        mounted() {
            wrapper = this.$el.children[0]
            container = wrapper.children[0]

            win = thisVm.$el.closest('.recycler-window')

            if (win) {
                isWindow = false
                doc = win

                _clientHeight = () => doc.clientHeight
            } else {
                isWindow = true
                win = window
                doc = document.documentElement

                _clientHeight = () => win.innerHeight
            }

            _scroll = top => doc.scrollTo(doc.scrollLeft, top)

            window.addEventListener('resize', onResize)
            win.addEventListener('scroll', onScroll)
            win.addEventListener('mousedown', onScrollStart)
            win.addEventListener('mouseup', onScrollFinish)

            win.addEventListener('touchstart', onTouchStart)

            onResize()
        }, beforeDestroy() {
            if (scrollingStop) {
                scrollingStop()
                scrollingStop = null
            }

            window.removeEventListener('resize', onResize)

            win.removeEventListener('scroll', onScroll)
            win.removeEventListener('mousedown', onScrollStart)
            win.removeEventListener('mouseup', onScrollFinish)

            clearScrollEvents()
            onScrollFinish()

            win.removeEventListener('touchstart', onTouchStart)

            clearTouchEvents()

            updateCancel()
        }
    }
}