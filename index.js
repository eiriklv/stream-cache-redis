var concat = require('concat-stream')
var PassThrough = require('stream').PassThrough
var through = require('through2')

var Cache = module.exports = function Cache(opts) {
  opts = opts || {}

  if (!(this instanceof Cache)) {
    return new Cache(opts)
  }

  var out = new PassThrough()

  opts.cache.get(opts.key, function(err, value) {
    if (err || !value) {
      if (opts.debug) {
        opts.debug('stream-cache-redis miss: ' + opts.key)
      }
      var stream = opts.get()
      stream.on('error', function(err) {
        out.emit('error', err)
      })
      stream
      .pipe(through(function(chunk, enc, done){
        out.push(chunk)
        done(null, chunk)
      }, function(done){
        out.push(null)
        done()
      }))
      .pipe(concat(function(val) {
        opts.cache.set(opts.key, val, function(err) {
          if (err) console.log('stream-cache-redis.set:', err)
        })
        opts.cache.expire(opts.key, opts.ttl, function(err) {
          if (err) console.log('stream-cache-redis.expire:', err)
        })
      }))
      return
    }
    if (opts.debug) {
      opts.debug('stream-cache-redis hit: ' + opts.key)
    }
    out.write(value)
    out.end()
  })

  return out
}
