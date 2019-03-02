var tape = require('tape')
var ssbKeys = require('ssb-keys')
var path = require('path')
var rmrf = require('rimraf')

var createSbot = require('ssb-server')
  .use(require('..'))

var alice = createSbot({
  temp: 'ooo_a',
  timeout: 1000,
  host: 'localhost',
  port: 34597,
  keys: ssbKeys.generate()
})
var bob = createSbot({
  temp: 'ooo_b',
  timeout: 1000,
  host: 'localhost',
  port: 34598,
  keys: ssbKeys.generate()
})

tape('connect', function (t) {
  bob.once('multiserver:listening', function () {
    bob.publish({type: 'test', ooo: true}, function (err, msg) {
      console.log(msg)
      var ts = Date.now()
      alice.ooo.get({id:msg.key, timeout: 1000}, function (err) {
        t.ok(err)
        t.ok(Date.now() > ts + 1000)
        alice.connect(bob.getAddress(), function () {
          alice.ooo.get({id:msg.key, timeout: 1000}, function (err, _data) {
            if(err) throw err
            t.deepEqual(_data.value, msg.value)
            alice.close()
            bob.close()
            t.end()
          })
        })
      })
    })
  })
})






