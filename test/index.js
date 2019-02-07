var tape = require('tape')
var ssbKeys = require('ssb-keys')
var path = require('path')
var rmrf = require('rimraf')

var createSbot = require('ssb-server')
  .use(require('..'))

var alice = createSbot({
  temp: 'ooo_a',
  timeout: 1000,
  port: 34597,
  keys: ssbKeys.generate()
})
var bob = createSbot({
  temp: 'ooo_b',
  timeout: 1000,
  port: 34598,
  host: 'localhost', timeout: 20001,
  replicate: {hops: 3, legacy: false},
  keys: ssbKeys.generate()
})

var carol_path = path.join('/tmp/test-ssb-ooo_carol/')
require('rimraf').sync(carol_path)

var carol = createSbot({
  path: carol_path,
  timeout: 1000,
  port: 34599,
  keys: ssbKeys.generate()
})

var m1, m2

tape('connect', function (t) {
  alice.connect(bob.getAddress(), function (err) {
    if(err) throw err
  })
  carol.connect(bob.getAddress(), function (err) {
    if(err) throw err
  })
  var start = Date.now()
  alice.publish({type: 'test', msg: 'hello'}, function (err, data) {
    if(err) throw err
    console.log(data)
    m1 = data
    carol.ooo.get(data.key, function (err, _data) {
      t.deepEqual(_data.value, data.value, 'received the message!')
      console.log('time', Date.now() - start)

      alice.publish({type: 'test2', msg: 'hello2'}, function (err, data) {
        m2 = data
        var start = Date.now()
        carol.ooo.get(data.key, function (err, _data) {
          if(err) throw err
          console.log('time2', Date.now() - start)
          t.deepEqual(_data.value, data.value, 'received the 2nd message!')
          alice.close()
          bob.close()
          carol.close(t.end)
        })
      })
    })
  })
})


tape('reopen', function (t) {
  var carol = createSbot({
    path: carol_path,
    timeout: 1000,
    port: 34599,
    keys: ssbKeys.generate()
  })

  carol.ooo.get(m1.key, function (err, data) {
    t.deepEqual(data.value, m1.value)
    carol.ooo.get(m2.key, function (err, data) {
      t.deepEqual(data.value, m2.value)
      t.end()
      carol.close()
    })
  })
})




