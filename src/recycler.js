import _ from 'lodash'

const mmin = Math.min,
    mmax = Math.max,
    mfloor = Math.floor,
    mround = Math.round,
    mabs = Math.abs,
    NEAR_ZERO = .0001,
    NEAR_ONE = 1 - NEAR_ZERO

export default function (Vue) {
    const hs = [],
        hsCache = {},
        hsBindedCache = [],
        BASE_NODE = document.createElement('div')

    let thisVm,
        updateId,

        itemCount,
        itemBottom,
        maxPosition,

        _itemCount,
        _itemView,
        _itemTop,
        stackFromBottom,

        scrollWin,
        scrollDoc,
        wrapper,
        container,

        _scroll,
        skipScroll = false,

        position = -1,
        offset = 0,

        hsPosition = 0,
        hsHeight = 0,
        maxOffset,
        hsOffset,

        clientHeight,
        scrollTop,
        scrollTopMax,
        scrollRatio,

        scrolling,
        scrollStarted,
        scrollFinishTimeout,
        scrollTime = 0,

        clueRatio, cluePosition,

        scrollHeight = 0, headerHeight = 0, footerHeight = 0

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

    function onResize() {
        for (let h of hs) h.height = 0

        //console.log('resize', clientHeight, scrollDoc.clientHeight, scrollDoc.offsetHeight)

        clientHeight = scrollDoc.clientHeight
        scrollTopMax = mmax(0, scrollDoc.scrollHeight - clientHeight)

        headerHeight = wrapper.offsetTop
        container.style.top = -headerHeight + 'px'

        footerHeight = mmax(scrollDoc.offsetHeight, scrollHeight) - headerHeight - thisVm.$el.offsetHeight

        console.log({
            clientHeight, scrollTopMax, headerHeight, footerHeight,
            _scrollHeight: scrollDoc.scrollHeight,
            offsetHeight: scrollDoc.offsetHeight
        })

        update()
    }

    function onScroll() {
        if (skipScroll) {
            skipScroll = false
            return
        }

        if (!scrolling) {
            scrolling = true

            //console.log('scrollStart', scrollStarted)

            clueRatio = itemCount ? scrollRatio : 0
            cluePosition = maxPosition * clueRatio

            if (!scrollStarted) {
                scrollWin.addEventListener('mousemove', onScrollContinue)
                scrollWin.addEventListener('wheel', onScrollContinue)

                onScrollContinue()
            }
        }

        if (!scrollStarted)
            scrollTime = Date.now()

        if (scrollFinishTimeout) {
            clearTimeout(scrollFinishTimeout)
            scrollFinishTimeout = setTimeout(onScrollFinish, 300)
        }

        // scrollTop = scrollDoc.scrollTop
        // scrollRatio = mmax(0, mmin(1, scrollTopMax > 0 ? scrollTop / scrollTopMax : 0))

        //console.log('scroll', scrollTop, scrollTopMax, scrollRatio)

        update()
    }

    function onScrollStart() {
        scrollStarted = true

        scrollTime = 0
    }

    function onScrollContinue() {
        if (scrollFinishTimeout)
            clearTimeout(scrollFinishTimeout)
        scrollFinishTimeout = setTimeout(onScrollFinish, 100)
    }

    function onScrollFinish() {
        scrollStarted = false

        if (scrollFinishTimeout) {
            clearTimeout(scrollFinishTimeout)
            scrollFinishTimeout = 0
        }

        if (scrolling) {
            //console.log('scrollFinish', scrollTop, scrollTopMax, scrollRatio)

            scrollWin.removeEventListener('mousemove', onScrollContinue)
            scrollWin.removeEventListener('wheel', onScrollContinue)

            scrolling = false

            update()
        }
    }

    function hsPop(position) {
        let h

        if (hsBindedCache[position]) {
            h = hsBindedCache[position]
            delete hsBindedCache[position]

            //console.log('hsPop binded', position)

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
                        data: () => data,
                        updated() {
                            console.log('upd')
                        }
                    }))
                }).$children[0],
                type: itemView.type
            }

            //h.vm._watcher.sync = true

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
        } else {
            container.appendChild(h.view)
            //h.style.display = ''

            //HACK: to render immediately
            // if (h.vm.position) {
            //     h.vm._watcher.sync = false
            //     h.vm.position = -1
            //
            //     h.vm._watcher.sync = true
            // }
            h.vm.position = position

            h.vm._update(h.vm._render(), true)
        }

        h.position = position
        h.top = _itemTop(position)
        if (!position) h.top += headerHeight

        if (h.maxHeight > 0) {
            h.height = mmax(h.minHeight, h.maxHeight * clientHeight)
                + h.top + (position == maxPosition ? itemBottom : 0)

            //Doing it later: h.style.height = h.height + 'px'
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
            for (let h of hs) h.height = 0

            return true
        } else if (!count) {
            return true;
        } else if (_position >= hsPosition && _position <= hsPosition + hs.length
            || hsPosition >= _position && hsPosition <= _position + count) {

            for (let i = mmax(0, _position - hsPosition), len = mmin(hs.length, _position - hsPosition + count); i < len; i++)
                hs[i].height = 0

            return true
        }
    }

    function updateContainer() {
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
            clientHeight = scrollDoc.clientHeight
            scrollTopMax = mmax(0, scrollHeight - clientHeight)

            // console.log({
            //     clientHeight, scrollTopMax, scrollHeight,
            //     _scrollHeight: scrollDoc.scrollHeight,
            //     offsetHeight: scrollDoc.offsetHeight
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
        // else {
        //     offsetRatio = .5
        // }

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

            thisVm.$emit('laidout', 0, hs, -1)

            return
        }

        let h = hsPop(maxPosition),
            up, down, i

        maxOffset = clientHeight - h.height
        hsPush(h)

        if (scrolling) {
            scrollTop = scrollDoc.scrollTop
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

        // if (up >= scrollTop + clientHeight) {
        //     up = scrollTop + clientHeight - 1
        //     down = up + h.height
        // } else if (down <= scrollTop) {
        //     down = scrollTop + 1
        //     up = down - h.height
        // }

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
                updateContainer()

                skipScroll = true
                _scroll(scrollTop = 0)
                scrollRatio = 0
            }
        } else if (!scrolling) {
            updateContainer()

            //const newScrollTop = scrollTopMax * scrollRatio
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
                        offset -= hs[i].height
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

        // position = hsPosition
        // offset = hsOffset

        thisVm.$emit('laidout', hsPosition, hs, scrolling ? scrollTime : -1)
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
                position = _position < 0 ? itemCount + _position : _position || 0
                offset = _offset === undefined ? 0 : _offset

                //console.log('nav', position, offset)

                update()
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

            scrollWin = thisVm.$el
            while (scrollWin = scrollWin.parentElement) {
                const cs = getComputedStyle(scrollWin, null)
                if (cs.getPropertyValue('overflow-y') != 'visible') break
            }

            if (scrollWin) {
                scrollDoc = scrollWin
            } else {
                scrollWin = window
                scrollDoc = document.documentElement
            }

            _scroll = top => scrollDoc.scrollTo(scrollDoc.scrollLeft, top)

            onResize()

            // scrollTop = scrollDoc.scrollTop
            // scrollRatio = mmax(0, mmin(1, scrollTopMax > 0 ? scrollTop / scrollTopMax : 0))

            let __scrollRatio

            window.addEventListener('wwheel', ev => {
                event.preventDefault()

                if (!scrolling) {
                    __scrollRatio = scrollRatio + ev.deltaY * .0005
                } else {
                    __scrollRatio = __scrollRatio + ev.deltaY * .0005
                }

                __scrollRatio = mmax(0, mmin(1, __scrollRatio))

                _scroll(scrollTopMax * __scrollRatio)
                console.log('__scrollRatio', __scrollRatio, scrollTopMax, scrollTopMax * __scrollRatio)

            }, {passive: false, capture: true})

            window.addEventListener('resize', onResize)
            scrollWin.addEventListener('scroll', onScroll)
            scrollWin.addEventListener('mousedown', onScrollStart)
            scrollWin.addEventListener('mouseup', onScrollFinish)

            update()
        }, beforeDestroy() {
            window.removeEventListener('resize', onResize)
            scrollWin.removeEventListener('scroll', onScroll)
            scrollWin.removeEventListener('mousedown', onScrollStart)
            scrollWin.removeEventListener('mouseup', onScrollFinish)

            scrollWin.removeEventListener('mousemove', onScrollContinue)
            scrollWin.removeEventListener('wheel', onScrollContinue)

            scrolling = false
            onScrollFinish()

            updateCancel()
        }
    }
}