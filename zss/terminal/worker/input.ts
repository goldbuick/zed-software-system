import { createDevice } from 'zss/network/device'

/*

create an input queue to match the behavior from zed cafe ??
do we need this only for game movement & action input ?
like normal typing shouldn't drop ANY key input.
also if we're edting complex data it should be through yjs

for gadget inputs, the input takes place in main, and then the result is 
sent worker side

*/

createDevice('input', [], (message) => {
  switch (message.target) {
    case 'key':
      // console.info('key', message.data)
      break
  }
})
