var pull = require('pull-stream')
var GQ = require('gossip-query')
var hash = require('ssb-keys/util').hash

function getId(msg) {
  return '%'+hash(JSON.stringify(msg, null, 2))
}

var Store = require('./store')
var log = console.error

console.error = function (m) {
  log(new Error('---------------').stack)
  log(m)

}

exports.name = 'ooo'
exports.version = '1.0.0'
exports.manifest = {
  stream: 'duplex',
  get: 'async'
}
exports.permissions = {
  anonymous: {allow: ['stream']}
}

var Flume = require('flumedb')
var OffsetLog = require('flumelog-offset')
var mkdirp = require('mkdirp')
var ViewHashtable = require('flumeview-hashtable')

exports.init = function (sbot, config) {
  var id = sbot.id

  store = Store(config)

  var gq = GQ({
    check: function (key, cb) {
      store.keys.get(key, function (err, data) {
        if(data) cb(null, data.value)
        else
          sbot.get({id:key, raw: true}, function (err, msg) {
            cb(null, msg)
          })
      })
    },
    process: function (id, msg, cb) {
      if(id !== getId(msg))
        cb()
      else cb(null, msg)
    }
  })

  function get (id, cb) {
    gq.query(id, function (err, msg) {
      if(err) return cb(err)
      store.add(msg, function (err, data) {
        cb(null, data)
      })
    })
  }

  sbot.get.hook(function (fn, args) {
    var id = args[0]
    var cb = args[1]
    if(id.raw) fn(id.id, cb)
    else
      fn(id, function (err, value) {
        console.log("GOT", id, err, value)
        if(!err) cb(null, value)
        else get(id, cb)
      })
  })

  sbot.on('rpc:connect', function (rpc, isClient) {
    console.log('CONNECT...', id.substring(0, 5), rpc.id.substring(0, 5))
    if(isClient) {
      var stream = gq.createStream(rpc.id)
      pull(stream, rpc.ooo.stream(function () {}), stream)
    }
  })

  return {
    stream: function () {
      //called by muxrpc, so remote id is set as this.id
      return gq.createStream(this.id)
    },
    get: get
  }
}

