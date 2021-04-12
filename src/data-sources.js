import {findIndex, findLast, noop} from 'lodash-es'
import {timeout} from '@rucebee/utils'

export function AbstractSource() {
    const list = []
    let recycler

    this.attached = false
    this.list = list
    this.getItem = position => list[position]
    this.itemCount = () => list.length

    this.indexOf = (item, fromIndex) => list.indexOf(item, fromIndex)
    this.findIndex = function () {
        return findIndex(list, ...arguments)
    }

    this.insert = (position, ...items) => {
        if (typeof position !== 'number') {
            position = this.indexOf(position)
            if (position < 0) return

            if (typeof items[0] === 'number')
                position += items.shift()
        }

        list.splice(position, 0, ...items)
        this.onInsert(position, items.length)

        return this
    }

    this.remove = (position, count = 1) => {
        if (typeof position !== 'number') {
            position = this.indexOf(position)
            if (position < 0) return
        }

        list.splice(position, count)
        this.onRemove(position, count)

        return this
    }

    this.reset = (_list) => {
        if (list.length)
            this.onRemove(0, list.length)

        list.length = 0

        if (_list?.length) {
            list.push(..._list)
            this.onInsert(0, _list.length)
        }

        return this
    }

    this.lockTop = fn => {
        if (!recycler) {
            fn()
            return
        }

        try {
            recycler.setStackFromBottom(false)
            fn()
        } finally {
            recycler.setStackFromBottom(true)
        }
    }

    this.attach = _recycler => {
        if (recycler !== _recycler) {
            this.onRecyclerChanged(recycler, _recycler)
            this.recycler = recycler = _recycler

            this.onDatasetChanged = recycler.onDatasetChanged
            this.recyclerUpdate = recycler.onUpdate
            this.recyclerInsert = recycler.onInsert
            this.recyclerRemove = recycler.onRemove
            this.triggerUpdate = recycler.update
            this.startPosition = recycler.startPosition
            this.endPosition = recycler.endPosition

            this.onDatasetChanged()

            if (!this.attached) {
                this.attached = true
                this.onAttach()
            }
        }
    }

    this.detach = _recycler => {
        if (recycler !== _recycler) return

        if (recycler) this.onRecyclerChanged(recycler, null)
        this.recycler = recycler = null

        if (this.attached) {
            this.attached = false
            this.onDetach()
        }

        this.onDatasetChanged = noop
        this.recyclerUpdate = noop
        this.recyclerInsert = noop
        this.recyclerRemove = noop
        this.triggerUpdate = noop
        this.startPosition = () => 0
        this.endPosition = () => -1
    }

    this.detach()
}

AbstractSource.prototype.onRecyclerChanged = noop
AbstractSource.prototype.onAttach = noop
AbstractSource.prototype.onDetach = noop
AbstractSource.prototype.onUpdate = function (position, count) {
    this.recyclerUpdate(position, count)
}
AbstractSource.prototype.onInsert = function (position, count) {
    this.recyclerInsert(position, count)
}
AbstractSource.prototype.onRemove = function (position, count) {
    this.recyclerRemove(position, count)
}

AbstractSource.prototype.update = function (...items) {
    for (const item of items) {
        const position = typeof item !== 'number' ? this.indexOf(item) : item
        if (position > -1) this.onUpdate(position, 1)
    }

    return this
}

AbstractSource.prototype.each = function (fn) {
    for (let i = 0; i < this.list.length; i++)
        fn(this.list[i], i)

    return this
}

function PeriodicRefresh(query, period) {
    let before = 0, nextTimeout = timeout(0), attached = false

    const next = () => {
        const now = Date.now()

        if (before <= now) {
            this.query()
        } else if (period && !this.request) {
            nextTimeout.stop()

            nextTimeout = timeout(before - now + 1000)
            nextTimeout.then(() => {
                if (attached) this.query()
            }, noop)
        }
    }

    this.request = null

    this.attach = () => {
        if (!attached) {
            attached = true

            next()
        }
    }

    this.detach = () => {
        if (attached) {
            attached = false

            nextTimeout.stop()
        }
    }

    this.query = dirty => {
        if (this.request) {
            if (dirty)
                before = 0
        } else if (!attached) {
            before = 0
        } else {
            before = period ? Date.now() + period : Number.MAX_SAFE_INTEGER

            nextTimeout.stop(true)

            this.request = query().then(() => {
                this.request = null

                if (attached) next()
            }).catch(err => {
                console.error(err)

                if (attached) {
                    nextTimeout = timeout(5000, () => {
                        this.request = null
                    })
                    nextTimeout.then(() => {
                        if (attached) this.query()
                    }, noop)
                } else {
                    this.request = null

                    before = 0
                }

                throw err
            })
        }
    }
}

export function ListSource(query, period) {
    AbstractSource.call(this)

    const list = this.list,
        refresh = new PeriodicRefresh(() =>
            query.call(this).then(_list => {
                this.onRemove(0, list.length)
                list.length = 0
                this.insert(0, ..._list)
            }), period)

    this.onAttach = refresh.attach
    this.onDetach = refresh.detach
    this.refresh = refresh.query
}

ListSource.prototype = Object.create(AbstractSource.prototype)
ListSource.prototype.constructor = ListSource

function onRecyclerChanged(from, to) {
    if (from) {
        from.$off('laidout', this.recyclerLaidout)
    } else if (to) {
        to.$on('laidout', this.recyclerLaidout)
    }
}

export function WaterfallSource(query, limit, loadingItem) {
    AbstractSource.call(this)

    const list = this.list, viewDistance = limit >> 1,

        refresh = new PeriodicRefresh(() => {
            const item = findLast(list, 'id', list.length - 2)

            return query.call(this, item, limit).then(_list => {
                if (item?.id !== findLast(list, 'id', list.length - 2)?.id) return

                if (_list?.length) {
                    this.insert(list.length - 1, ..._list)

                    const startPos = this.startPosition()
                    if (startPos > limit)
                        this.remove(0, startPos - viewDistance)

                    this.triggerUpdate()
                } else if (loading) {
                    loading = false

                    this.remove(loadingItem)
                }

            })
        }, 0)

    let loading = false

    this.onAttach = () => {
        if (!loading) {
            loading = true

            this.insert(list.length, loadingItem)
        }

        refresh.attach()
    }

    this.onDetach = refresh.detach

    this.recyclerLaidout = (position, hs) => {
        if (loading && position + hs.length - 1 + viewDistance >= list.length)
            refresh.query()
    }

    this.cut = position => {
        console.log({position})

        let len = list.length - position - 2
        if (loading) len--
        if (len < 1) return

        this.remove(position + 1, len)

        if (!loading) {
            loading = true

            this.insert(list.length, loadingItem)
        }

        this.triggerUpdate()
    }
}

WaterfallSource.prototype = Object.create(AbstractSource.prototype)
WaterfallSource.prototype.constructor = WaterfallSource
WaterfallSource.prototype.onRecyclerChanged = onRecyclerChanged

export function HistorySource(queryNext, queryHistory, limit, loadingItem, fromId = 0, period = 0) {
    AbstractSource.call(this)

    let firstIndex = 1, enabled = true, attached = false

    const list = this.list, viewDistance = limit >> 1,

        cutHistory = () => {
            const startPos = this.startPosition()

            if (startPos > limit && startPos - viewDistance < list.length - firstIndex) {
                this.remove(firstIndex, startPos - viewDistance)

                if (!firstIndex) {
                    firstIndex = 1
                    this.insert(0, loadingItem)
                }

                console.log('cutHistory', firstIndex, startPos - viewDistance, list[firstIndex])

                return true
            }
        },

        nextRefresh = new PeriodicRefresh(() => queryNext.call(this, list.length <= firstIndex ? undefined : list[list.length - 1], limit).then(_list => {
            if (_list.length) {
                if (list.length <= firstIndex) {
                    this.insert(list.length, ..._list)
                } else {
                    this.insert(list.length, ..._list)

                    if (!historyRefresh.request) cutHistory()
                }

                if (_list.length >= limit) this.triggerUpdate()
            } else if (list.length <= firstIndex && firstIndex) {
                firstIndex = 0
                this.remove(0, 1)
            } else if (!historyRefresh.request) {
                cutHistory()
            }
        }), period),

        historyRefresh = new PeriodicRefresh(() => {
            if (!firstIndex || list.length <= firstIndex) return Promise.resolve()

            const item = list[firstIndex]

            return queryHistory.call(this, list[firstIndex], limit).then(_list => {
                if (!_list
                    || !firstIndex
                    || list.length <= firstIndex
                    || item.id !== list[firstIndex].id
                    || cutHistory()) return

                if (_list.length) this.insert(firstIndex, ..._list)

                if (_list.length < limit) {
                    firstIndex = 0
                    this.remove(0)
                } else {
                    this.triggerUpdate()
                }
            })
        }, 0)

    list.push(loadingItem)

    this.empty = () => list.length <= firstIndex

    this.refresh = nextRefresh.query

    this._onAttach = () => {
        attached = true

        if (enabled) {
            nextRefresh.attach()
            historyRefresh.attach()
        }
    }

    this._onDetach = () => {
        attached = false

        nextRefresh.detach()
        historyRefresh.detach()
    }

    this.setEnabled = _enabled => {
        enabled = _enabled

        if (attached) {
            if (enabled) this.onAttach()
            else this.onDetach()
        }
    }

    this.recyclerLaidout = (position, hs) => {
        if (firstIndex && list.length > firstIndex && position <= viewDistance)
            historyRefresh.query()
    }
}

HistorySource.prototype = Object.create(AbstractSource.prototype)
HistorySource.prototype.constructor = HistorySource
HistorySource.prototype.onAttach = function () {
    this._onAttach()
}
HistorySource.prototype.onDetach = function () {
    this._onDetach()
}
HistorySource.prototype.onRecyclerChanged = onRecyclerChanged