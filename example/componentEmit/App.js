import {
  h
} from '../../lib/guide-mini-vue.esm.js'
import {
  Foo
} from './Foo.js'

export const APP = {

  setup() {
    return {
      msg: 'this setState'
    }
  },
  render() {
    return h('div', {}, [
      h('div', {}, 'app'),
      h(Foo, {
        onAdd(a,b) {
          console.log('onAdd',a,b);
        },
        onAddFoo (a,b) {
          console.log('onAddFoo',a,b);
        }
      })
    ])
  },
}