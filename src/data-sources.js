import _ from 'lodash'
import {timeout} from 'robo'

const NOOP = () => {
}

function AbstractSource(list) {
    this.list = list
    this.getItem = position => list[position]
    this.itemCount = () => list.length

    this.indexOf = (item, fromIndex) => list.indexOf(item, fromIndex)
    this.findIndex = function () {
        return _.findIndex(list, ...arguments)
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

    this.setRecycler = recycler => {
        if (recycler) {
            this.onDatasetChanged = recycler.onDatasetChanged
            this.onUpdate = recycler.onUpdate
            this.onInsert = recycler.onInsert
            this.onRemove = recycler.onRemove
            this.triggerUpdate = recycler.update
            this.startPosition = recycler.startPosition
            this.endPosition = recycler.endPosition

            this.onDatasetChanged()
        } else {
            this.onDatasetChanged = NOOP
            this.onUpdate = NOOP
            this.onInsert = NOOP
            this.onRemove = NOOP
            this.triggerUpdate = NOOP
            this.startPosition = () => 0
            this.endPosition = () => -1
        }
    }

    this.setRecycler(null)
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

export function ListSource(query) {
    const list = this.list

    this.query = () => query().then(_list => {
        this.onRemove(0, list.length)
        list.length = 0
        this.insert(0, ..._list)
    }).catch(err => {
        console.error(err)
    })
}

ListSource.prototype = new AbstractSource([null])

export function WaterfallSource(query, limit) {
    const list = this.list, viewDistance = limit >> 1

    let request

    this.onRange = (startPos, endPos) => {
        if (!request && endPos + viewDistance >= list.length) {
            request = query(list[list.length - 2], limit).then(_list => {
                //return

                this.insert(list.length - 1, ..._list)

                startPos = this.startPosition()
                if (startPos > limit)
                    this.remove(0, startPos - viewDistance)

                request = null
                this.triggerUpdate()
            }).catch(err => {
                //TODO
                console.error(err)

                setTimeout(() => {
                    request = null
                    this.triggerUpdate()
                }, 5000)
            })
        }
    }
}

WaterfallSource.prototype = new AbstractSource([null])

export function HistorySource(queryNext, queryHistory, limit) {
    const self = this, list = this.list, viewDistance = limit >> 1

    let attached = false, dirty = true,
        requestNext = null, errorNextTimeout = timeout(0),
        requestHistory = {}, errorHistoryTimeout = timeout(0),
        oldestItem = null, latestItem = null,
        refreshPeriod = 0, refreshTimeout = 0

    function cutHistory(_list) {
        return false
        const startPos = self.startPosition(),
            firstIndex = oldestItem ? 1 : 0
        if (startPos > limit && startPos - viewDistance < list.length - firstIndex) {
            self.remove(firstIndex, startPos - viewDistance)
            oldestItem = _list[firstIndex]

            if (!firstIndex)
                self.insert(0, null)

            return true
        }
    }

    this.onRange = (startPos, endPos) => {
        if (false && !requestHistory && startPos <= viewDistance) {
            requestHistory = queryHistory(oldestItem, limit, this).then(_list => {
                if (!cutHistory(_list)) {
                    if (_list.length) {
                        oldestItem = _list[0]
                        this.insert(1, ..._list)

                        requestHistory = null
                        this.triggerUpdate()
                    } else {
                        this.remove(0)
                    }
                }
            }).catch(err => {
                //TODO
                console.error(err)

                if (attached) {
                    errorHistoryTimeout.stop(true)
                    errorHistoryTimeout = timeout(50000, () => {
                        requestHistory = null
                        if (attached) this.triggerUpdate()
                    })
                }
            })
        }
    }

    this.refreshPeriod = function (period) {
        refreshPeriod = period || 0

        if (refreshTimeout) {
            clearTimeout(refreshTimeout)
            refreshTimeout = 0
        }

        if (refreshPeriod)
            this.refresh()
    }

    this.refresh = function () {
        if (requestNext) {
            dirty = true
            return
        }

        dirty = false

        if (refreshTimeout) {
            clearTimeout(refreshTimeout)
            refreshTimeout = 0
        }

        if (refreshPeriod)
            setTimeout(self.refresh, refreshPeriod)

        requestNext = queryNext(latestItem, self).then(_list => {
            if (_list.length) {
                latestItem = _list[_list.length - 1]
                self.insert(list.length, ..._list)

                if (!oldestItem) {
                    oldestItem = _list[0]
                    requestHistory = null

                    self.triggerUpdate()
                }
            } else if (!latestItem && list.length) {
                self.remove(0, list.length)
            }

            requestNext = null
            if (dirty) {
                self.refresh()
            } else if (!requestHistory || !oldestItem) {
                if (cutHistory(_list))
                    requestHistory = null
            }
        }).catch(err => {
            //TODO
            console.error(err)

            if (attached) {
                errorNextTimeout.stop(true)
                errorNextTimeout = timeout(50000, () => {
                    requestNext = null
                    if (attached) self.refresh()
                })
            }
        })
    }

    this.attach = function (period) {
        attached = true

        //this.refreshPeriod(period)
    }

    this.detach = function () {
        attached = false

        errorNextTimeout.stop()
        errorHistoryTimeout.stop()

        this.refreshPeriod(0)
    }

    this.refresh()
}

HistorySource.prototype = new AbstractSource([null])