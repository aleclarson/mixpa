// @ts-check
global.XMLHttpRequest = require('xhr2')

const { v4: makeUUID } = require('@lukeed/uuid')
const mixpa = require('./')

const mp = mixpa.create({
  token: process.env.TOKEN,
  debug: true,
  queueSend(send, method, body) {
    console.log(method + ':', body)
    return send().catch(err => {
      console.error(err, { [method]: body })
    })
  },
})

mp.setState({
  $device_id: makeUUID(),
})

console.log('mp =>', mp)
global.mp = mp

require('repl').start()
