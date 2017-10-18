import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import reducers from './reducers';
import threadDispatcher from '../common/thread-middleware';
import handleMessages from '../common/message-handler';
import messages from './messages-content';

/**
 * Isolate the store creation into a function, so that it can be used outside of the
 * app's execution context, e.g. for testing.
 * @return {object} Redux store.
 */
export default function initializeStore() {
  const summaryWorker = new Worker('summary-worker.js');
  const dateGraphWorkers = [0,1,2,3].map(_ => new Worker('date-graph-worker.js'));

  const store = createStore(
    combineReducers(Object.assign({}, reducers)),
    applyMiddleware(...[
      thunk,
      threadDispatcher(summaryWorker, 'toSummaryWorker'),
      threadDispatcher(dateGraphWorkers[0], 'toDateGraphWorker'),
      threadDispatcher(dateGraphWorkers[1], 'toDateGraphWorker'),
      threadDispatcher(dateGraphWorkers[2], 'toDateGraphWorker'),
      threadDispatcher(dateGraphWorkers[3], 'toDateGraphWorker'),
      process.env.NODE_ENV === 'development'
        ? createLogger({titleFormatter: action => `content action ${action.type}`})
        : null,
    ].filter(fn => fn)));

  handleMessages(summaryWorker, store, messages);
  handleMessages(dateGraphWorkers[0], store, messages);
  handleMessages(dateGraphWorkers[1], store, messages);
  handleMessages(dateGraphWorkers[2], store, messages);
  handleMessages(dateGraphWorkers[3], store, messages);

  dateGraphWorkers.forEach((worker, i) => {
    worker.postMessage({
      type: 'SET_WORKER_INFORMATION',
      workerIndex: i,
      numWorkers: dateGraphWorkers.length,
    });
  });

  return store;
}
