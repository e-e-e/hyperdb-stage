const hyperdb = require('hyperdb')
const ram = require('random-access-memory')

function createOne () {
  return hyperdb(() => ram())
}

function put (db, list, cb) {
  var i = 0
  loop(null)

  function loop (err) {
    if (err) return cb(err)
    if (i === list.length) return cb(null)

    var next = list[i++]
    if (typeof next === 'string') next = {key: next, value: next}
    db.put(next.key, next.value, loop)
  }
}

function run () {
  var fns = [].concat.apply([], arguments) // flatten
  loop(null)

  function loop (err) {
    if (fns.length === 1 || err) return fns.pop()(err)
    fns.shift()(loop)
  }
}

module.exports = {
  createOne,
  run,
  put
}
