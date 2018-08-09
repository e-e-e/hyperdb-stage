var nanoiterator = require('nanoiterator')

function concat (...iterators) {
  let i = 0
  return nanoiterator({
    next: function (cb) {
      if (!iterators[i]) return cb(null, null)
      iterators[i].next((err, v) => {
        if (err) return cb(err)
        if (v === null) {
          i++
          return this._next(cb)
        }
        cb(err, v)
      })
    }
  })
}

module.exports = concat
