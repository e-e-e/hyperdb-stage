# hyperdb-stage

hyperdb-stage is a wrapper for [hyperdb](https://github.com/mafintosh/hyperdb) which enables staged changes.

This enables you to interact with the stage as if it is the actual hyperdb instance. Put, delete, get, create a stream of data, or whatever, exactly as you would normally. However any changes you make to the stage will not effect the actual db until you commit them.

## Installation

```
npm install hyperdb-stage
```


## Usage

A super simple example:

```js
const hyperdb = require('hyperdb')
const stage = require('hyperdb-stage')
const ram = require('random-access-memory')

const db = hyperdb(() => ram())

db.put('a', 'value', () => {
  // simply wrap any db in stage to create a staging area
  const tmp = stage(db)
  tmp.put('b', 'next value', () => {
    // b is not yet available in the db until you commit
    tmp.commit(() => {
      // b is now committed added to the db
    })
  })
})
```
