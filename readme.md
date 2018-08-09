# hyperdb-stage

[![Build Status](https://travis-ci.org/e-e-e/hyperdb-stage.svg?branch=master)](https://travis-ci.org/e-e-e/hyperdb-stage) [![Coverage Status](https://coveralls.io/repos/github/e-e-e/hyperdb-stage/badge.svg?branch=master)](https://coveralls.io/github/e-e-e/hyperdb-stage?branch=master)

A staging area for [hyperdb](https://github.com/mafintosh/hyperdb).

This enables you to interact with the stage as if it is the actual hyperdb instance. Put, delete, get, create a stream of data, or whatever, exactly as you would normally. However any changes you make to the stage will not effect the actual db until you commit them.

**hyperdb-stage is not multi writer enabled.**

## Installation

```
npm install hyperdb-stage
```

## Usage

A super simple example:

```js
const hyperdb = require('hyperdb')
const createStage = require('hyperdb-stage')
const ram = require('random-access-memory')

const db = hyperdb(() => ram())

db.put('a', 'value', () => {
  // simply wrap any db in stage to create a staging area
  const tmp = createStage(db)
  tmp.put('b', 'next value', () => {
    // b is not yet available in the db until you commit
    tmp.commit(() => {
      // b is now committed added to the db
    })
  })
})
```

## API

Stage has mostly the same api as [hyperdb](https://github.com/mafintosh/hyperdb#api).

### Stage specific functions

In addition to hyperdb there are these special stage methods.

#### `stage = createStage(db)`

Takes a hyperdb instance and returns a staging area.

#### `stage.commit(callback)`

This commits staged changes to the hyperdb.

**Note:** hyperdb-stage commits the state of the staging area, not its history. Changes are committed in key hash order *not* in the order that they were added. 

Callback is fired once all changes have been committed.

#### `stage.revert()`

Destroy all staged changes.

### Unsupported Hyperdb methods

The Staging area is not intended to be replicated or shared. It is a temporary in memory database for staging changes before committing them to your db instance.

As such the following methods are unsupported. 

- db.key
- db.discoveryKey
- db.local
- db.on()
- db.version()
- db.checkout(version)
- db.authorize(key, [callback])
- db.authorized(key, [callback])
- db.replicate([options])

**Note:** You can still access these methods via `staging.db` or on the original hyperdb instance.

