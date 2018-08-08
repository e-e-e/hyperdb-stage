/* eslint-env mocha */
const { expect } = require('chai')
const Stage = require('../index.js')
const { createOne, run, put } = require('./helpers')

function testStream (db, values, cb) {
  const testing = [...values]
  const stream = db.createReadStream()
  stream.on('data', (data) => {
    // console.log(data[0].key, data.length && data[0].value && data[0].value.toString())
    expect(data[0].value && data[0].value.toString()).to.eql(testing.pop())
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
        cb => testStream(stage, ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns a stream from staging if db has no values', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(stage, ['a', 'b', 'c'], cb),
        cb => testStream(stage, ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns values from staging rather than db', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => put(stage, [{ key: 'a', value: 'a2' }, { key: 'b', value: 'b2' }, { key: 'c', value: 'c2' }], cb),
        cb => testStream(stage, ['a2', 'b2', 'c2'], cb),
        done
      )
    })
    it('returns values from both', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'c'], cb),
        cb => put(stage, ['b'], cb),
        cb => testStream(stage, ['a', 'b', 'c'], cb),
        done
      )
    })
    it('returns values from both (again)', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'c', 'b'], cb),
        cb => put(stage, ['b', 'd'], cb),
        cb => testStream(stage, ['d', 'a', 'b', 'c'], cb),
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
        cb => testStream(stage, ['b', 'c'], cb),
        done
      )
    })
    it('returns does not return a value if deleted in staging (again)', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => stage.del('c', cb),
        cb => testStream(stage, ['a', 'b'], cb),
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
        cb => testStream(db, ['a', 'b', 'c'], cb),
        cb => testStream(stage.stage, [], cb),
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
        cb => testStream(db, ['f', 'd', 'e', 'a', 'b', 'c'], cb),
        cb => testStream(stage.stage, [], cb),
        done
      )
    })
    // This test fails at the moment because there is no way of iterating over deleted keys in a db.
    xit('merges deletes from the stanging database into the hyperdb', (done) => {
      const db = createOne()
      const stage = new Stage(db)
      run(
        cb => put(db, ['a', 'b', 'c'], cb),
        cb => stage.del('c', cb),
        cb => stage.commit(cb),
        cb => testStream(db, ['a', 'b'], cb),
        done
      )
    })
  })
})
