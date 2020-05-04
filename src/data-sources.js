import _ from 'lodash'

export function WaterfallSource(query, limit) {
    const noop = () => {
        }, list = [null],
        viewDistance = limit >> 1

    let onDatasetChanged, onUpdate, onInsert, onRemove, recyclerUpdate,
        request,
        startPos = 0, endPos = 0

    this.getItem = position => list[position]
    this.itemCount = () => list.length
    this.setRecycler = recycler => {
        if (recycler) {
            onDatasetChanged = recycler.onDatasetChanged
            onUpdate = recycler.onUpdate
            onInsert = recycler.onInsert
            onRemove = recycler.onRemove
            recyclerUpdate = recycler.update

            onDatasetChanged()
        } else {
            onDatasetChanged =
                onUpdate =
                    onInsert =
                        onRemove =
                            recyclerUpdate = noop
        }
    }
    this.onRange = (_startPos, position) => {
        startPos = _startPos
        endPos = position

        if (!request && position + viewDistance >= list.length) {
            request = query(list[list.length - 2], limit).then(_list => {
                //return

                position = list.length - 1

                list.splice(position, 0, ..._list)

                onInsert(position, _list.length)

                if (startPos > limit) {
                    list.splice(0, startPos - viewDistance)

                    onRemove(0, startPos - viewDistance)
                }

                request = null
                recyclerUpdate()
            }, err => {
                //TODO
                console.error(err)

                request = null
                recyclerUpdate()
            })
        }
    }
    this.insert = (position, item) => {
        list.splice(position, 0, item)
        onInsert(position, 1)
    }
    this.remove = (position) => {
        list.splice(position, 1)
        onRemove(position, 1)
    }
    this.list = list
}