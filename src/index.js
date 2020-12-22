import Recycler from 'babel-loader!./recycler'

// export default function install(Vue, options = {}) {
//     const component = Recycler()
//     Vue.component(component.name, component)
//     return component
// }

export {Recycler}
export * from 'babel-loader!./data-sources'

// if (typeof window !== 'undefined' && window.Vue) {
//     window.Vue.use(install)
// }