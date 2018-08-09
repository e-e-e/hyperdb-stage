/* eslint-env mocha */
const { expect } = require('chai')
const Stage = require('../index.js')
const { createOne, run, put } = require('./helpers')

function testStream (stream, values, cb) {
  const testing = [...values]
  stream.on('data', (data) => {
    if (Array.isArray(data)) data = data[0]
    // console.log(data.key, data.value && data.value.toString())
    expect(data.value && data.value.toString()).to.eql(testing.pop())
  })
  stream.on('error', cb)
  stream.on('end', () => {
    expect(testing).to.have.length(0)
    cb()
  })
}

describe('Staged', () => {
  describe('#get', () => {
    it('returns value from staging if one exists', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, [{ key: 'b', value: 'new' }], cb),
        cb => {
          stage.get('b', (err, nodes) => {
            expect(err).to.eql(null)
            expect(nodes[0].value.toString()).to.eql('new')
            cb()
          })
        },
        done
      )
    })
    it('returns value from db if one does not exists in staging', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, [{ key: 'b', value: 'new' }], cb),
        cb => {
          stage.get('a', (err, nodes) => {
            expect(err).to.eql(null)
            expect(nodes[0].value.toString()).to.eql('a')
            cb()
          })
        },
        done
      )
    })
    it('returns does not return a value if deleted in staging', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => {
          stage.del('a', cb)
        },
        cb => {
          stage.get('a', (err, nodes) => {
            expect(err).to.eql(null)
            expect(nodes).to.have.length(0)
            cb()
          })
        },
        done
      )
    })
  })

  describe('#createReadStream', () => {
    it('returns a stream from db if staging has no values', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => testStream(stage.createReadStream(), ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns a stream from staging if db has no values', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(stage, ['a', 'b', 'c'], cb),
        cb => testStream(stage.createReadStream(), ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns values from staging rather than db', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, [{ key: 'a', value: 'a2' }, { key: 'b', value: 'b2' }, { key: 'c', value: 'c2' }], cb),
        cb => testStream(stage.createReadStream(), ['a2', 'b2', 'c2'], cb),
        done
      )
    })
    it('returns values from both', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'c'], cb),
        cb => put(stage, ['b'], cb),
        cb => testStream(stage.createReadStream(), ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns values from both (again)', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'c', 'b'], cb),
        cb => put(stage, ['b', 'd'], cb),
        cb => testStream(stage.createReadStream(), ['d', 'a', 'b', 'c'], cb),
        done
      )
    })
    it('returns does not return a value if deleted in staging', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => {
          stage.del('a', cb)
        },
        cb => testStream(stage.createReadStream(), ['b', 'c'], cb),
        done
      )
    })
    it('returns does not return a value if deleted in staging (again)', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => stage.del('c', cb),
        cb => testStream(stage.createReadStream(), ['a', 'b'], cb),
        done
      )
    })
  })
  describe('#createHistoryStream', () => {
    context('with opts.reverse = true', () => {
      it('returns first the history from staging and then from the hyperdb', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(db, ['a', 'b', 'c'], cb),
          cb => put(stage, ['d', 'e', 'f'], cb),
          cb => testStream(stage.createHistoryStream({ reverse: true }), ['a', 'b', 'c', 'd', 'e', 'f'], cb),
          done
        )
      })
      it('returns only the history from db when stage is empty', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(db, ['a', 'b', 'c'], cb),
          cb => testStream(stage.createHistoryStream({ reverse: true }), ['a', 'b', 'c'], cb),
          done
        )
      })
      it('returns only the history from stage when db is empty', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(stage, ['d', 'e', 'f'], cb),
          cb => testStream(stage.createHistoryStream({ reverse: true }), ['d', 'e', 'f'], cb),
          done
        )
      })
    })
    context('with opts.reverse = false', () => {
      it('returns first the history from hyperdb and then from the stage', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(db, ['a', 'b', 'c'], cb),
          cb => put(stage, ['d', 'e', 'f'], cb),
          cb => testStream(stage.createHistoryStream(), ['f', 'e', 'd', 'c', 'b', 'a'], cb),
          done
        )
      })
      it('returns only the history from db when stage is empty', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(db, ['a', 'b', 'c'], cb),
          cb => testStream(stage.createHistoryStream(), ['c', 'b', 'a'], cb),
          done
        )
      })
      it('returns only the history from stage when db is empty', (done) => {
        const db = createOne()
        const stage = new Stage(db)
        run(
          cb => put(stage, ['d', 'e', 'f'], cb),
          cb => testStream(stage.createHistoryStream(), ['f', 'e', 'd'], cb),
          done
        )
      })
    })
  })
  describe('#keyHistoryStream', () => {
    it('returns first the key history from staging and then from the hyperdb', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => db.put('a', '1', cb),
        cb => db.put('a', '2', cb),
        cb => db.del('a', cb),
        cb => stage.del('a', cb),
        cb => stage.put('a', '3', cb),
        cb => stage.del('a', cb),
        cb => stage.put('a', '4', cb),
        cb => testStream(stage.createKeyHistoryStream('a'), ['4', null, '3', null, null, '2', '1'].reverse(), cb),
        done
      )
    })
    it('returns only the key history from db when stage is empty', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => db.put('a', '1', cb),
        cb => db.put('a', '2', cb),
        cb => db.del('a', cb),
        cb => testStream(stage.createKeyHistoryStream('a'), [null, '2', '1'].reverse(), cb),
        done
      )
    })
    it('returns only the key history from stage when db is empty', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => stage.del('a', cb),
        cb => stage.put('a', '3', cb),
        cb => stage.del('a', cb),
        cb => stage.put('a', '4', cb),
        cb => testStream(stage.createKeyHistoryStream('a'), ['4', null, '3', null].reverse(), cb),
        done
      )
    })
  })
  describe('#revert', () => {
    it('discards all changes in the staging area', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, ['d', 'e', 'f'], cb),
        cb => { stage.revert(); cb() },
        cb => testStream(db.createReadStream(), ['a', 'b', 'c'], cb),
        cb => testStream(stage.stage.createReadStream(), [], cb),
        done
      )
    })
  })
  describe('#commit', () => {
    it('merges additions from the stanging database into the hyperdb', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, ['d', 'e', 'f'], cb),
        cb => stage.commit(cb),
        cb => testStream(db.createReadStream(), ['f', 'd', 'e', 'a', 'b', 'c'], cb),
        cb => testStream(stage.stage.createReadStream(), [], cb),
        done
      )
    })
    // This test fails at the moment because there is no way of iterating over deleted keys in a db.
    it('merges deletes from the stanging database into the hyperdb', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => stage.del('c', cb),
        cb => stage.commit(cb),
        cb => testStream(db.createReadStream(), ['a', 'b'], cb),
        done
      )
    })
  })
})
