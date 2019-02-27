/* @flow */

const sinon = require('sinon');
const assert = require('assert');
import delay from 'pdelay';
import {synchd, synchdFn} from '../src';

describe('synchd', function() {
  it('queues', function() {
    const spy = sinon.spy();
    const o = {};

    synchd(o, () => {
      spy('first start');
      return delay(50).then(() => {
        spy('first end');
      });
    });

    synchd(o, () => {
      spy('second start');
      return delay(50).then(() => {
        spy('second end');
      });
    });

    return synchd(o, () => {
      spy('third start');
      return delay(50).then(() => {
        spy('third end');
        return 456;
      });
    }).then(x => {
      assert.strictEqual(x, 456);
      assert.deepStrictEqual(spy.args, [
        ['first start'],
        ['first end'],
        ['second start'],
        ['second end'],
        ['third start'],
        ['third end']
      ]);
    });
  });

  it('queues when functions throw', function() {
    const spy = sinon.spy();
    const o = {};

    synchd(o, () => {
      spy('first start');
      return delay(50).then(() => {
        spy('first end');
        throw new Error('foo');
      });
    }).catch(() => {});

    synchd(o, () => {
      spy('second start');
      return delay(50).then(() => {
        spy('second end');
        throw null;
      });
    }).catch(() => {});

    return synchd(o, () => {
      spy('third start');
      return delay(50).then(() => {
        spy('third end');
        throw 456;
      });
    }).catch(e => {
      assert.strictEqual(e, 456);
      assert.deepStrictEqual(spy.args, [
        ['first start'],
        ['first end'],
        ['second start'],
        ['second end'],
        ['third start'],
        ['third end']
      ]);
    });
  });

  it('works after queue clears', function() {
    const spy = sinon.spy();
    const o = {};

    return synchd(o, () => {
      spy('first start');
      return delay(50).then(() => {
        spy('first end');
      });
    })
      .then(() => delay(50))
      .then(() => {
        return synchd(o, () => {
          spy('second start');
          return delay(50).then(() => {
            spy('second end');
          });
        });
      })
      .then(() => {
        assert.deepStrictEqual(spy.args, [
          ['first start'],
          ['first end'],
          ['second start'],
          ['second end']
        ]);
      });
  });

  it('does not queue for different scopeKeys', function() {
    const spy = sinon.spy();

    synchd({}, () => {
      spy('first start');
      return delay(30).then(() => {
        spy('first end');
      });
    });

    synchd({}, () => {
      spy('second start');
      return delay(60).then(() => {
        spy('second end');
      });
    });

    return delay(100).then(() => {
      assert.deepStrictEqual(spy.args, [
        ['first start'],
        ['second start'],
        ['first end'],
        ['second end']
      ]);
    });
  });

  it('handles re-entrance', function() {
    const spy = sinon.spy();
    const o = {};
    let i = 0;

    const foo = () => {
      synchd(o, () => {
        const run = i++;
        spy('start', run);

        if (run === 0) foo();

        return delay(50).then(() => {
          spy('end', run);
        });
      });
    };

    foo();

    return delay(150).then(() => {
      assert.deepStrictEqual(spy.args, [
        ['start', 0],
        ['end', 0],
        ['start', 1],
        ['end', 1]
      ]);
    });
  });
});

describe('synchdFn', function() {
  it('works', function() {
    const spy = sinon.spy();

    const foobar = synchdFn({}, (x: number, y: string) => {
      spy('start', x, y);
      return delay(30).then(() => {
        spy('end', x, y);
      });
    });

    foobar(1, 'one');
    foobar(2, 'two');

    return delay(120).then(() => {
      assert.deepStrictEqual(spy.args, [
        ['start', 1, 'one'],
        ['end', 1, 'one'],
        ['start', 2, 'two'],
        ['end', 2, 'two']
      ]);
    });
  });
});
