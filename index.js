const hyperdb = require('hyperdb')
const ram = require('random-access-memory')
const toStream = require('nanoiterator/to-stream')
const join = require('./lib/join-iterator')
const concat = require('./lib/concat-iterator')
const r2w = require('./lib/read-to-write-transform-stream')

function Stage (db) {
  if (!(this instanceof Stage)) return new Stage(db)
  this.db = db
  this._reduce = db._reduce
  this._map = db._map
  this._valueEncoding = db._valueEncoding
  const opts = {
    reduce: this._reduce,
    map: this._map,
    valueEncoding: this._valueEncoding
  }
  this.stage = hyperdb(() => ram(), opts)
}

Stage.prototype.get = function (key, cb) {
  this.stage.get(key, { deletes: true }, (err, nodes) => {
    if (err || nodes.length) {
      return cb(err, nodes.filter(n => !n.deleted))
    }
    this.db.get(key, cb)
  })
}

Stage.prototype.iterator = function (...args) {
  const stage = this.stage.iterator(...args)
  const db = this.db.iterator(...args)
  return join(this.stage, stage, db)
}

Stage.prototype.createReadStream = function (...args) {
  return toStream(this.iterator(...args))
}

Stage.prototype.list = function (...args) {
  return hyperdb.prototype.list.apply(this, args)
}

Stage.prototype.history = function (opts) {
  const stage = this.stage.history(opts)
  const db = this.db.history(opts)
  return (opts && opts.reverse) ? concat(stage, db) : concat(db, stage)
}

Stage.prototype.createHistoryStream = function (...args) {
  return toStream(this.history(...args))
}

Stage.prototype.keyHistory = function (...args) {
  const stage = this.stage.keyHistory(...args)
  const db = this.db.keyHistory(...args)
  return concat(stage, db)
}

Stage.prototype.createKeyHistoryStream = function (...args) {
  return toStream(this.keyHistory(...args))
}

Stage.prototype.put = function (...args) {
  return this.stage.put(...args)
}

Stage.prototype.del = function (...args) {
  return this.stage.del(...args)
}

Stage.prototype.batch = function (...args) {
  return this.stage.batch(...args)
}

Stage.prototype.watch = function (...args) {
  return this.stage.watch(...args)
}

Stage.prototype.createWriteStream = function (...args) {
  return this.stage.createWriteStream(...args)
}

Stage.prototype.revert = function () {
  this.stage = hyperdb(() => ram())
}

Stage.prototype.commit = function (cb) {
  const reader = this.stage.createReadStream({ deletes: true })
  const writer = this.db.createWriteStream()
  reader.on('error', cb)
  writer.on('error', cb)
  writer.on('finish', () => {
    this.stage = hyperdb(() => ram())
    cb()
  })
  reader.pipe(r2w()).pipe(writer)
}

module.exports = Stage
