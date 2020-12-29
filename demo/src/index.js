import Vue from "vue"
import NumbersApp from "./NumbersApp"

const vm = new Vue({
    el: '#app',
    render: h => h(NumbersApp),
})