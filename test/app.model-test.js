import expect from 'expect';
import dva from '../src/index';
import { take, call } from '../effects';

describe('app.model', () => {
  it('reducer enhancer', () => {
    function enhancer(reducer) {
      return (state, action) => {
        if (action.type === 'square') {
          return state * state;
        }
        return reducer(state, action);
      };
    }

    const app = dva();
    app.model({
      namespace: 'count',
      state: 3,
      reducers: [ {
        ['add'](state) {
          return state + 1;
        }
      }, enhancer ]
    });
    app.router(({ history }) => <div />);
    app.start();

    app.store.dispatch({ type: 'square' });
    app.store.dispatch({ type: 'add' });
    expect(app.store.getState().count).toEqual(10);
  });

  it('effects: type takeEvery', () => {
    let count = 0;
    const app = dva();
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        ['add']: function*() {
          yield 1;
          count = count + 1;
        }
      }
    });
    app.router(({ history }) => <div />);
    app.start();

    app.store.dispatch({ type: 'add' });
    app.store.dispatch({ type: 'add' });
    expect(count).toEqual(2);
  });

  it('effects: type takeLatest', (done) => {
    let count = 0;
    const app = dva();
    const delay = (timeout) => {
      return new Promise(resolve => {
        setTimeout(resolve, timeout);
      });
    };
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        ['add']: [ function*() {
          yield call(delay, 1);
          count = count + 1;
        }, {
          type: 'takeLatest'
        } ]
      }
    });
    app.router(({ history }) => <div />);
    app.start();

    // Only catch the last one.
    app.store.dispatch({ type: 'add' });
    app.store.dispatch({ type: 'add' });

    setTimeout(() => {
      expect(count).toEqual(1);
      done();
    }, 100);
  });

  it('effects: type watcher', (done) => {
    let count = 0;
    const app = dva();
    const delay = (timeout) => {
      return new Promise(resolve => {
        setTimeout(resolve, timeout);
      });
    };
    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        ['addWatcher']: [ function*() {
          /*eslint-disable no-constant-condition*/
          while(true) {
            yield take('add');
            yield delay(1);
            count = count + 1;
          }
        }, {
          type: 'watcher'
        } ]
      }
    });
    app.router(({ history }) => <div />);
    app.start();

    // Only catch the first one.
    app.store.dispatch({ type: 'add' });
    app.store.dispatch({ type: 'add' });

    setTimeout(() => {
      expect(count).toEqual(1);
      done();
    }, 100);
  });

  it('effects: onError', () => {
    const errors = [];
    const app = dva({
      onError: (error) => {
        errors.push(error.message);
      }
    });

    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        ['add']: function*() {
          yield 1;
          throw new Error('effect error');
        }
      }
    });
    app.router(({ history }) => <div />);
    app.start();
    app.store.dispatch({ type: 'add' });

    expect(errors).toEqual([ 'effect error' ]);
  });

  it('subscriptions: onError', (done) => {
    const errors = [];
    const app = dva({
      onError: (error) => {
        errors.push(error.message);
      }
    });

    app.model({
      namespace: 'count',
      state: 0,
      effects: {
        ['add']: function*() {
          yield 1;
          throw new Error('effect error');
        }
      },
      subscriptions: [
        function (dispatch, done) {
          dispatch({ type: 'add' });
          setTimeout(() => {
            done('subscription error');
          }, 100);
        }
      ]
    });
    app.router(({ history }) => <div />);
    app.start();

    setTimeout(() => {
      expect(errors).toEqual([ 'effect error', 'subscription error' ]);
      done();
    }, 500);
  });
});
