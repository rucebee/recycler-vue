<template>
    <div class="container">
        <Recycler :source="dataSource" @laidout="onLaidout">
            <NumberView/>

            <template v-slot:loading>
                <LoadingView/>
            </template>
        </Recycler>
    </div>
</template>

<script>
    import Recycler from '../src'
    import {WaterfallSource} from '../src'

    function queryNumbers(item, limit) {
        return new Promise(resolve => {
            setTimeout(() => {
                const items = [], id = item?.id ?? -1
                for (let i = 1; i <= limit; i++)
                    items.push({id: id + i, size: Math.round(1 + 10 * Math.random())})

                resolve(items)
            }, 3000)
        })
    }

    const dataSource = new WaterfallSource(queryNumbers, 20, {type: 'loading'}),
        LoadingView = {
            name: 'LoadingView',
            template: '<div style="display:flex;align-items:center;background:#999;max-height:100%;"><p style="text-align:center;font-size:4em;width:100%">Loading...</p></div>'
        },
        NumberView = {
            name: 'NumberView',
            //template: '<p v-html="item.text"></p>',
            template: '<p><span :style="{fontSize: (0 || item.size) + \'em\'}">{{position}} - {{item.id}}</span></p>'
        }

    export default {
        name: 'App',
        components: {
            Recycler, NumberView, LoadingView
        },
        data() {
            return {
				dataSource
			}
        },
        methods: {
            onLaidout(position, hs, interacting) {
                //console.log(position, position + hs.length, time)

               dataSource.onRange(position, position + hs.length - 1)
            }
        },
        mounted() {
             window.dataSource = dataSource
        }
    }
</script>