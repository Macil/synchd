/* @flow */

const sinon = require('sinon');
const assert = require('assert');
const semver = require('semver');
import delay from 'pdelay';
import {synchd, synchdFn} from '../src';

describe('synchd', function() {
  it('queues', function() {
    this.slow(500);

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
    this.slow(500);

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
    this.slow(500);

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
    this.slow(500);

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
    this.slow(500);

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

  const unhandledWarningsSupported = semver.satisfies(process.version, '>= 6.6.0');
  const usesUnhandledRejection = semver.satisfies(process.version, '>= 7.0.0');

  (
    unhandledWarningsSupported ? it : xit
  )('uncaught rejections are not handled', function() {
    const spy = sinon.spy();
    process.on(usesUnhandledRejection ? 'unhandledRejection' : 'warning', spy);

    synchd({}, () => {
      throw 'expected 1';
    });

    return delay(10).then(() => {
      process.removeListener(usesUnhandledRejection ? 'unhandledRejection' : 'warning', spy);

      assert(spy.calledOnce);
      const warning = spy.args[0][0];
      if (usesUnhandledRejection) {
        assert.strictEqual(warning, 'expected 1');
      } else {
        assert.strictEqual(warning.name, 'UnhandledPromiseRejectionWarning');
      }
    });
  });

  (
    unhandledWarningsSupported ? it : xit
  )('uncaught queued rejections are not handled', function() {
    const spy = sinon.spy();
    process.on(usesUnhandledRejection ? 'unhandledRejection' : 'warning', spy);

    const o = {};
    synchd(o, () => Promise.reject('expected 2'));
    synchd(o, () => Promise.reject('expected 3'));
    synchd(o, () => Promise.reject('expected 4'));

    return delay(10).then(() => {
      process.removeListener(usesUnhandledRejection ? 'unhandledRejection' : 'warning', spy);

      assert.strictEqual(spy.callCount, 3);
      const warning1 = spy.args[0][0];
      const warning2 = spy.args[1][0];
      const warning3 = spy.args[2][0];
      if (usesUnhandledRejection) {
        assert.strictEqual(warning1, 'expected 2');
        assert.strictEqual(warning2, 'expected 3');
        assert.strictEqual(warning3, 'expected 4');
      } else {
        assert.strictEqual(warning1.name, 'UnhandledPromiseRejectionWarning');
        assert.strictEqual(warning2.name, 'UnhandledPromiseRejectionWarning');
        assert.strictEqual(warning3.name, 'UnhandledPromiseRejectionWarning');
      }
    });
  });
});

describe('synchdFn', function() {
  it('works', function() {
    this.slow(500);

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
