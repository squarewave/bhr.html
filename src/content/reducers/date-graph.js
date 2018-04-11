/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { ThunkAction } from '../actions/types';
import type { State } from '../reducers/types';
import type { DateGraph } from '../../common/types/workers';
import { getProfile } from './profile-view';
import { createSelector } from 'reselect';

export default function dateGraphReducer(
  state: DateGraphState = {
    dateGraph: { length: 0, totalTime: new Float32Array(), totalCount: new Float32Array() },
    totalDateGraph: { length: 0, totalTime: new Float32Array(), totalCount: new Float32Array() },
  }, action: ThunkAction
) {
  let key = (action.type === 'TOTAL_DATE_GRAPH_REBUILT') ? 'totalDateGraph' : 'dateGraph';
  switch (action.type) {
    case 'TOTAL_DATE_GRAPH_REBUILT':
    case 'DATE_GRAPH_REBUILT': {
      const dateGraph = {
        length: action.dateGraph.length,
        totalTime: action.dateGraph.length === state[key].length ?
          Float32Array.from(state[key].totalTime) : new Float32Array(action.dateGraph.length),
        totalCount: action.dateGraph.length === state[key].length ?
          Float32Array.from(state[key].totalCount) : new Float32Array(action.dateGraph.length),
      };
      for (let i = 0; i < action.dateGraph.length; i++) {
        if (i % action.numWorkers === action.workerIndex) {
          dateGraph.totalTime[i] = action.dateGraph.totalTime[i];
          dateGraph.totalCount[i] = action.dateGraph.totalCount[i];
        }
      }
      return Object.assign({}, state, {
        [key]: dateGraph,
      });
    }
    default:
      return state;
  }
}

export const getDateGraph = (state: State): DateGraph => {
  return state.dateGraph.dateGraph;
};

export const getTotalDateGraph = (state: State): DateGraph => {
  return state.dateGraph.totalDateGraph;
};
