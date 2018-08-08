var nanoiterator = require('nanoiterator')

function sort (a, b) {
  if (!a && !b) return 0
  if (!a && b) return 1
  if (a && !b) return -1
  const ahash = a[0].path.join('')
  const bhash = b[0].path.join('')
  if (ahash < bhash) return -1
  if (ahash > bhash) return 1
  if (bhash === ahash && a[0].key !== b[0].key) return -1
  else return 0
}

function nextNotDeleted (staging, iter, cb) {
  iter.next((err, v) => {
    if (err || !v) return cb(err, v)
    staging.get(v[0].key, { deletes: true }, (err, node) => {
      if (err) return cb(err, v)
      if (node && node.length > 0 && node.every(n => n.deleted)) {
        // deleted in staging so ignore this value and get the next value
        return nextNotDeleted(staging, iter, cb)
      }
      cb(null, v)
    })
  })
}

function join (db, a, b) {
  let aValue = null
  let bValue = null
  return nanoiterator({
    open: (cb) => {
      let waiting = 2
      let error = null
      a.next((err, v) => {
        aValue = v
        maybeDone(err)
      })
      nextNotDeleted(db, b, (err, v) => {
        bValue = v
        maybeDone(err)
      })
      function maybeDone (err) {
        if (err) error = err
        waiting--
        if (waiting > 0) return
        cb(error)
      }
    },
    next: function (cb) {
      let error = null
      let waiting = 0
      let returnValue
      if (aValue === null && bValue === null) {
        return cb(null, null)
      }
      const sortValue = sort(aValue, bValue)
      if (sortValue < 0) {
        // console.log('return last value from stage get new value from stage')
        a.next((err, v) => {
          process.nextTick(cb, err, aValue)
          aValue = v
        })
      } else if (sortValue > 0) {
        // console.log('return last value from db and get new value from old db')
        nextNotDeleted(db, b, (err, v) => {
          process.nextTick(cb, err, bValue)
          bValue = v
        })
      } else {
        // console.log('return last value from stage get new value from stage and old db')
        waiting = 2
        // prefer staged value to return
        returnValue = aValue
        a.next((err, v) => {
          aValue = v
          maybeDone(err)
        })
        nextNotDeleted(db, b, (err, v) => {
          bValue = v
          maybeDone(err)
        })
      }
      function maybeDone (err) {
        if (err) error = err
        waiting--
        if (waiting > 0) return
        process.nextTick(cb, error, returnValue)
      }
    }
  })
}

module.exports = join
