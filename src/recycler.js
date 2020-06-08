import _ from 'lodash'
import {animate} from 'robo'

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

        _itemCount,
        _itemBuilder,
        _itemTop,
        stackFromBottom

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

        itemCount,
        itemBottom,
        maxPosition,

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

        let itemBuilder = _itemBuilder(position),
            hsTypeCache = hsCache[itemBuilder.type]

        if (!hsTypeCache)
            hsCache[itemBuilder.type] = hsTypeCache = []

        h = hsTypeCache.pop()
        if (!h) {
            if (itemBuilder.type === 'Loading') {
                h = slots['Loading']()
                console.log(h, h.position, h.type)
            } else {
                h = itemBuilder.build()
            }

            h.position = position
            h.$root = vm
            h.$mount()
            h.$emit = (...args) => vm.$emit.apply(vm, args)
            h._watcher.active = false


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
            container.append(h.$el)

            //h.style.display = ''

            h.position = -1
            h.position = position
            h._update(h._render(), false)

            //console.log('bind', position, h.source)
        }

        h.top = _itemTop(position)
        if (!position) h.top += headerHeight

        if (h.maxHeight > 0) {
            h.height = mmax(h.minHeight, h.maxHeight * clientHeight)
                + h.top + (position == maxPosition ? itemBottom : 0)

            //Doing it later:
            //h.style.height = h.height + 'px'
        } else {
            h.height = h.$el.offsetHeight + h.top

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

        h.$el.remove()
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
        itemBottom = _itemTop(-1) + footerHeight

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

        //console.log({scrollTop, scrolling, touching})

        if (touching) {
            hsOffset -= scrollTop - touchTop

            touchTop = scrollTop

            hs.push(h = hsPop(hsPosition))
        } else if (scrolling) {
            scrolled = true

            scrollRatio = mmax(0, mmin(1, scrollMax > 0 ? scrollTop / scrollMax : 0))

            const positionReal = maxPosition * scrollRatio

            hs.push(h = hsPop(hsPosition = mfloor(positionReal)))

            hsOffset = scrollRatio * maxOffset - (positionReal % 1) * h.height

            //console.log({scrollRatio, hsPosition, hsOffset})
        } else if (stackFromBottom) {
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
        if (allShown) {
            if (!scrolling) {
                _scrollMax()

                if (Math.abs(scrollTop + hsOffset) >= 1)
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

            if (hsPosition == 0 && hsOffset > 0) {
                hsOffset = 0
                up = 0

                if (touching || !scrolling) {
                    _scrollMax()

                    _scroll(touchTop = scrollTop = 0)
                    scrollRatio = 0
                }
            } else if (touching || !scrolling) {
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

        const scrollOffset = isFixed ? 0 : scrollTop
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
                    height -= itemBottom

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

        if (!scrolling && !touching)
            vm.$emit('laidout', hsPosition, hs)

        win.dispatchEvent(scrolledEvent = new Event('scroll'))
    }

    let scrolled = false,
        scrolling = false,
        scrolledEvent = null,
        scrollStarted = 0,
        scrollEndTimeout,

        touching = false,
        touchTop


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

        // console.log('resize', {
        //     clientHeight,
        //     clientHeightEx,
        //     scrollTopMax,
        //     headerHeight,
        //     bodyHeight,
        //     elHeight: el.offsetHeight,
        //     footerHeight
        // })

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

        if (scrolling) {
            scrolling = false

            update()
        }
    }, onTouchStart = ev => {
        //console.log('onTouchStart', ev?.type, allShown)

        if (allShown) {
            onScrollContinue(ev)
            return
        }

        win.addEventListener('touchend', onTouchEnd)

        touchTop = doc.scrollTop

        touching = true
    }, onTouchEnd = ev => {
        //console.log('onTouchEnd', ev?.type)

        win.removeEventListener('touchend', onTouchEnd)

        if (touching) {
            touching = false

            update()
        }
    }

    function created() {
        _itemCount = this.itemCount
        _itemBuilder = this.itemBuilder
        _itemTop = this.itemTop
        stackFromBottom = this.stackFromBottom

        itemCount = _itemCount()
        itemBottom = _itemTop(-1)
        maxPosition = itemCount - 1
    }

    function mounted() {
        el = this.$el
        win = el.closest('.recycler-window') ?? window
        isWindow = win === window
        isFixed = isWindow
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
                        dataFn = Ctor.options.data

                    Ctor.options.data = function () {
                        const data = dataFn.call(this)
                        data.position = -1
                        data.type = type
                        return data
                    }

                    slots[type] = () => new Ctor({
                        _isComponent: true,
                        _parentVnode: vnode,
                        parent: vm
                    })
                })(type, vnode)


                continue loop
            }

        console.log(slots)
    }

    function beforeDestroy() {
        if (win.recycler === this)
            delete win.recycler

        removeEventListener('resize', onResize)

        win.removeEventListener('scroll', onScroll, true)
        win.removeEventListener('wheel', onScrollContinue, true)
        win.removeEventListener('mousedown', onScrollContinue, true)
        win.removeEventListener('mousemove', onScrollContinue, true)

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

    _.mergeWith(this.$options, {created, mounted, beforeDestroy}, (objValue, srcValue) =>
        _.isArray(objValue) ? objValue.concat([srcValue]) : (objValue ? undefined : [srcValue]))

    this.$options.methods = _.defaults({
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
            offset = _offset === undefined ? (position ? headerHeight : 0) : _offset

            //console.log('position', {position, offset})

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
        scrollTop: () => hsPosition
            ? firstHeight + (doc.scrollTop - scrollMax / maxPosition) / (scrollMax - scrollMax / maxPosition) * (scrollMax - firstHeight)
            : -offset
    }, this.$options.methods)
}

export default {
    name: 'Recycler',

    Builder(Vue, component, propsData) {
        const Component = Vue.extend(component),
            data = component.data?.() ?? {},
            dataFn = () => _.assign({position: undefined, type: component.name}, data)

        this.type = component.name
        this.build = () => new Component({
            data: dataFn,
            propsData: propsData
        })
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

    beforeCreate
}
