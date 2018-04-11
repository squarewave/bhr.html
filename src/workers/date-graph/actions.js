/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { buildDateGraph } from '../../common/date-graph';
import memoize from 'memoize-immutable';
import TupleMap from 'tuplemap';

let gWorkerIndex = -1;
let gNumWorkers = 0;

let rebuildTickets = {};
const buildDateGraphCache = new TupleMap();
const buildDateGraphMemoized = memoize(buildDateGraph, {
  cache: buildDateGraphCache,
});

export function rebuildDateGraph(thread, stack, messageKey, storeThread) {
  return function(dispatch, getState) {
    if (!rebuildTickets[messageKey]) {
      rebuildTickets[messageKey] = 0;
    }
    let ticket = ++rebuildTickets[messageKey];

    if (thread && storeThread) {
      buildDateGraphCache.clear();
      dispatch({
        type: 'THREAD_CHANGED',
        thread
      });
    }

    let stateThread = thread || getState().thread;

    if (stateThread) {
      let length = stateThread.dates.length;
      let dateGraph = {
        totalTime: new Float32Array(length),
        totalCount: new Float32Array(length),
        length,
      };
      setTimeout(function rebuildDate(dateIndex) {
        dateIndex = dateIndex === undefined ? dateGraph.length - 1 : dateIndex;
        // Only rebuild if our ticket is current. This prevents a deluge of
        // rebuild requests from piling up.
        if (ticket === rebuildTickets[messageKey]) {
          let dateGraphResult = buildDateGraphMemoized(stateThread, stack, dateIndex);
          dateGraph.totalTime[dateIndex] = dateGraphResult.totalTime;
          dateGraph.totalCount[dateIndex] = dateGraphResult.totalCount;
          dispatch({
            toContent: true,
            type: messageKey,
            dateGraph: dateGraph,
            workerIndex: gWorkerIndex,
            numWorkers: gNumWorkers,
          });

          while (dateIndex - 1 >= 0) {
            dateIndex--;
            if (dateIndex % gNumWorkers === gWorkerIndex) {
              setTimeout(() => rebuildDate(dateIndex), 0);
              break;
            }
          }
        }
      }, 0);
    }
  };
}

export function setWorkerInformation(workerIndex, numWorkers) {
  gWorkerIndex = workerIndex;
  gNumWorkers = numWorkers;
  return () => {};
}
