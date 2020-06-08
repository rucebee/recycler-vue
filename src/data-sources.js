import _ from 'lodash'
import {timeout} from 'robo'

const NOOP = () => {
}

function AbstractSource() {
    const list = []
    let recycler

    this.attached = false
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

    this.setRecycler = _recycler => {
        recycler = _recycler

        if (recycler) {
            this.onDatasetChanged = recycler.onDatasetChanged
            this.onUpdate = recycler.onUpdate
            this.onInsert = recycler.onInsert
            this.onRemove = recycler.onRemove
            this.triggerUpdate = recycler.update
            this.startPosition = recycler.startPosition
            this.endPosition = recycler.endPosition

            this.onDatasetChanged()

            if (!this.attached) {
                this.attached = true
                this.onAttach()
            }
        } else {
            if (this.attached) {
                this.attached = false
                this.onDetach()
            }

            this.onDatasetChanged = NOOP
            this.onUpdate = NOOP
            this.onInsert = NOOP
            this.onRemove = NOOP
            this.triggerUpdate = NOOP
            this.startPosition = () => 0
            this.endPosition = () => -1
        }
    }

    this.removeRecycler = _recycler => {
        if (recycler === _recycler)
            this.setRecycler(null)
    }

    this.setRecycler(null)
}

AbstractSource.prototype.onAttach = NOOP
AbstractSource.prototype.onDetach = NOOP

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
    AbstractSource.call(this)

    const list = this.list

    this.query = () => query().then(_list => {
        this.onRemove(0, list.length)
        list.length = 0
        this.insert(0, ..._list)
    }).catch(err => {
        console.error(err)
    })
}

ListSource.prototype = Object.create(AbstractSource.prototype)
ListSource.prototype.constructor = ListSource

export function WaterfallSource(query, limit, loadingItem) {
    AbstractSource.call(this)

    const list = this.list, viewDistance = limit >> 1

    list.push(loadingItem)

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

WaterfallSource.prototype = Object.create(AbstractSource.prototype)
WaterfallSource.prototype.constructor = WaterfallSource

export function HistorySource(queryNext, queryHistory, limit, loadingItem, refreshPeriod = 0) {
    AbstractSource.call(this)

    const self = this, list = this.list, viewDistance = limit >> 1

    list.push(loadingItem)

    let dirty = true,
        requestNext = null, errorNextTimeout = timeout(0),
        requestHistory = {}, errorHistoryTimeout = timeout(0),
        oldestItem = null, latestItem = null,
        refreshTimeout = 0

    function cutHistory() {
        const startPos = self.startPosition(),
            firstIndex = oldestItem ? 1 : 0
        if (startPos > limit && startPos - viewDistance < list.length - firstIndex) {
            self.remove(firstIndex, startPos - viewDistance)
            oldestItem = list[firstIndex]

            console.log('cutHistory', firstIndex, startPos - viewDistance, oldestItem)

            if (!firstIndex)
                self.insert(0, loadingItem)

            return true
        }
    }

    this.onRange = (startPos, endPos) => {
        if (!requestHistory && startPos <= viewDistance) {
            requestHistory = queryHistory(oldestItem, limit, this).then(_list => {
                if (!cutHistory()) {
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

                if (this.attached) {
                    errorHistoryTimeout.stop(true)
                    errorHistoryTimeout = timeout(50000, () => {
                        requestHistory = null
                        if (this.attached) this.triggerUpdate()
                    })
                }
            })
        }
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
                if (cutHistory())
                    requestHistory = null
            }
        }).catch(err => {
            //TODO
            console.error(err)

            if (this.attached) {
                errorNextTimeout.stop(true)
                errorNextTimeout = timeout(50000, () => {
                    requestNext = null
                    if (this.attached) self.refresh()
                })
            }
        })
    }

    this.onAttach = function () {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout)
            refreshTimeout = 0
        }

        this.refresh()
    }

    this.onDetach = function () {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout)
            refreshTimeout = 0
        }

        errorNextTimeout.stop()
        errorHistoryTimeout.stop()
    }
}

HistorySource.prototype = Object.create(AbstractSource.prototype)
HistorySource.prototype.constructor = HistorySource