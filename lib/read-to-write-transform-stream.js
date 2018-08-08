const { Transform } = require('stream')

function tranlateNodeToInsertStatement (nodes) {
  if (!nodes) return nodes
  if (nodes.length === 0) return undefined
  return {
    type: nodes[0].deleted ? 'del' : 'put',
    key: nodes[0].key,
    value: nodes[0].value
  }
}

module.exports = function () {
  return new Transform({
    objectMode: true,
    transform (data, encoding, callback) {
      callback(null, tranlateNodeToInsertStatement(data))
    }
  })
}
