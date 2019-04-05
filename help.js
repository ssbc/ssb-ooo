
module.exports = {
  description: 'gossip ssb messages without replicating the entire feed, aka "Out of Order"',
  commands: {
    get: {
      type: 'async',
      description: 'get a message',
      args: {
        id: {
          type: 'MessageId',
          description: 'the identity of the message to get',
          optional: false
        },
        timeout: {
          type: 'number',
          description: 'number of milliseconds to wait for this message, default: 5000, or as set in `config.ooo.timeout`. If timeout is zero it will wait forever.',
          optional: true
        }
      }
    }
  }
}
