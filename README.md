# ssb-ooo

retrieve ssb messages Out Of Order.

## overview

ssb messages are [totally ordered](https://en.wikipedia.org/wiki/Total_order) by feed,
and this is used to validate the integrity of a feed. In ssb it's also intended that
you do not necessarily replicate the entire network's data,
but just your local corner of it (your circle of friends)

However, sometimes there are messages that are just a little beyond these bounds.
ssb-ooo gives you more nuanced control over how fuzzy the bounds of your network is.

In `ooo` you pull in a message by it's hash. You _cannot_ request a message if you don't know
the hash. Normally, when you replicate a feed, you validate those messages in the context
of their public key and signatures - because of some expression of interest in the future
of that feed. In `ooo` you only pull in messages that someone you replicate has responded
to. So, the signature on the ooo message doesn't really matter, what matters is that the
signature on your friends message signs the hash of the ooo message, and the ooo message
has that hash. Who wrote the ooo message isn't really important, what's important is that
your friend responded to it.

## design

This module is just an adapter bring [gossip-query](https://github.com/dominictarr/gossip-query)
into a secure scuttlebutt context. The design of the protocol
in general is discussed there.

## api

### ooo.get (id | {id, timeout:ms?}, cb)

get a message with `ooo`.
if it takes longer than timeout, an error will be returned.
the message may still be retrived later.

by default, `ssb-ooo` also intercepts `sbot.get` any
message that you try to retrive that is not in the log
will be got via ooo, and once the timeout has been exceeded,
it will check the log again, but let it callback directly that time.
this can be disabled by setting `ooo: { hook: false}` in your config.

### ooo.stream ()

called by the client to initiate a ooo protocol stream.
(normally this happens automatically, when two peers connect)

## configuration

``` js
{
  timeout: 5000, //how many ms to wait before calling back anyway.
  hook: true,    //disable hooking of sbot.get
}
```

## License

MIT

