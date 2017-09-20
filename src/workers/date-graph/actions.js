/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { buildDateGraph } from '../../common/date-graph';

let rebuildTicket = 0;
export function rebuildDateGraph(thread, stack) {
  return function(dispatch, getState) {
    let ticket = ++rebuildTicket;

    if (thread) {
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
        if (ticket === rebuildTicket) {
          let dateGraphResult = buildDateGraph(stateThread, stack, dateIndex);
          dateGraph.totalTime[dateIndex] = dateGraphResult.totalTime;
          dateGraph.totalCount[dateIndex] = dateGraphResult.totalCount;
          dispatch({
            toContent: true,
            type: 'DATE_GRAPH_REBUILT',
            dateGraph: dateGraph,
          });

          if (dateIndex - 1 >= 0) {
            setTimeout(() => rebuildDate(dateIndex - 1), 0);
          }
        }
      }, 0);
    }
  };
}
