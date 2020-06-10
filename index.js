var pull = require('pull-stream')
var GQ = require('gossip-query')
var hash = require('ssb-keys/util').hash
var isMsg = require('ssb-ref').isMsg
var checkInvalidOOO = require('ssb-validate').checkInvalidOOO

function getId(msg) {
  return '%'+hash(JSON.stringify(msg, null, 2))
}

function isObject (o) {
  return o && 'object' === typeof o
}

var Store = require('./store')

exports.name = 'ooo'
exports.version = '1.0.0'
exports.manifest = {
  stream: 'duplex',
  get: 'async',
  help: 'sync'
}
exports.permissions = {
  anonymous: {allow: ['stream']}
}

exports.init = function (sbot, config) {
  var id = sbot.id

  var conf = config.ooo || {}

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
          sbot.get({id:key, ooo: false}, function (err, msg) {
            cb(null, msg)
          })
      })
    },
    isUpdate: function (id, msg, value) {
      return value == null && getId(msg) == id
    },
    process: function (id, msg, cb) {
      if(id !== getId(msg) || checkInvalidOOO(msg, null))
        cb()
      else cb(null, msg)
    },
    timeout: conf.timeout || 30e3
  })

  function get (opts, cb) {
    var id = isMsg(opts) ? opts : opts.id
    var timeout = opts.timeout != null ? opts.timeout : conf.timeout == null ? 5000 : conf.timeout
    var timer
    if(timeout > 0)
      timer = setTimeout(function () {
        var _cb = cb
        cb = null
        _cb(new Error('ooo.get: took more than timeout:'+timeout))
      }, timeout)

    gq.query(id, function (err, msg) {
      if(err) return cb(err)
      store.add(msg, function (err, data) {
        data.ooo = true
        clearTimeout(timer)
        cb && cb(null, data)
      })
    })
  }

  if(conf.hook !== false)
    sbot.get.hook(function (fn, args) {
      var id = args[0]
      var cb = args[1]
      if(!isMsg(id.id || id))
        return fn.apply(this, args)
      if(id.ooo === false && isMsg(id.id)) fn(id, cb)
      else
        fn(id, function (err, value) {
          if(!err) cb(null, value)
          else get(id, function (_err, data) {
            if(_err) fn(id, cb) //just in-case, try the log again
            else cb(null, id.meta === true ? data : data.value)
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
    get: get,
    help: function () {
      return require('./help')
    }
  }
}
