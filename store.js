var Flume = require('flumedb')
var OffsetLog = require('flumelog-offset')
var mkdirp = require('mkdirp')
var ViewHashTable = require('flumeview-hashtable')

var codec = require('flumecodec/json')
var path = require('path')
var hash = require('ssb-keys/util').hash

function getId(msg) {
  return '%'+hash(JSON.stringify(msg, null, 2))
}

module.exports = function (config) {
  //we'll store out of order messages in their own log
  //so that we don't interfere with the views on in in-order messages
  //it does mean we'll download them again later if we follow
  //this feed, but it makes everything simpler overall
  //and the point of messages is to be small
  //and the point of ooo messages is that there
  //is not really that many.

  var log = OffsetLog(
    path.join(config.path, 'ooo', 'log.offset'),
    {blockSize:1024*16, codec:codec}
  )
  var store = Flume(log)
    .use('keys', ViewHashTable(2, function (key) {
      var b = new Buffer(key.substring(1,7), 'base64').readUInt32BE(0)
      return b
    }))

  store.add = function (msg, cb) {
    var data = {
      key: getId(msg),
      value: msg,
      timestamp: Date.now()
    }
    store.append(data, function (err) {
      if(err) cb(err)
      else cb(null, data)
    })
  }

  return store
}
