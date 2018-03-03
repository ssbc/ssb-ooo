var pull = require('pull-stream')
var GQ = require('gossip-query')
var hash = require('ssb-keys/util').hash
var isMsg = require('ssb-ref').isMsg

function getId(msg) {
  return '%'+hash(JSON.stringify(msg, null, 2))
}

function isObject (o) {
  return o && 'object' === typeof o
}

var Store = require('./store')
//var log = console.error

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
    isQuery: isMsg,
    isRequest: function (n) {
      return Number.isInteger(n) && n < 0
    },
    isResponse: function (o) {
      return o && isObject(o)
    },
    check: function (key, cb) {
      store.keys.get(key, function (err, data) {
        if(data) cb(null, data.value)
        else
          sbot.get({id:key, raw: true}, function (err, msg) {
            cb(null, msg)
          })
      })
    },
    isUpdate: function (id, msg, value) {
      return value == null && getId(msg) == id
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
        data.ooo = true
        cb(null, data)
      })
    })
  }

  sbot.get.hook(function (fn, args) {
    var id = args[0]
    var cb = args[1]
    if(!isMsg(id.id || id))
      return fn.apply(this, args)
      //return cb(new Error('not a message id:' + (id.id || id)))
    if(id.raw && isMsg(id.id)) fn(id.id, cb)
    else
      fn(id, function (err, value) {
        if(!err) cb(null, value)
        else get(id, function (err, data) {
          if(err) cb(err)
          else cb(null, data.value)
        })
      })
  })

  sbot.status.hook(function (fn, args) {
    var status = fn()
    status.ooo = {}
    for(var id in gq.state) {
      var v = gq.state[id]
      if(!v.value)
        status.ooo[id] = {
          state: v.state,
          weight: v.weight
        }
    }
    return status
  })

  sbot.progress.hook(function (fn, args) {
    var prog = fn()
    prog.ooo = gq.progress()
    return prog
  })


  sbot.on('rpc:connect', function (rpc, isClient) {
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


