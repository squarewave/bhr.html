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

    setTimeout(function () {
      // Only rebuild if our ticket is current. This prevents a deluge of
      // rebuild requests from piling up.
      if (ticket === rebuildTicket) {
        let stateThread = getState().thread;
        if (stateThread) {
          dispatch({
            toContent: true,
            type: 'DATE_GRAPH_REBUILT',
            dateGraph: buildDateGraph(stateThread, stack),
          });
        }
      }
    }, 0);
  };
}
