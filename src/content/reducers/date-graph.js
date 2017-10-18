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
  state: DateGraph = { length: 0, totalTime: new Float32Array(), totalCount: new Float32Array() },
  action: ThunkAction
) {
  switch (action.type) {
    case 'DATE_GRAPH_REBUILT': {
      const newState = {
        length: action.dateGraph.length,
        totalTime: action.dateGraph.length === state.length ?
          Float32Array.from(state.totalTime) : new Float32Array(action.dateGraph.length),
        totalCount: action.dateGraph.length === state.length ?
          Float32Array.from(state.totalCount) : new Float32Array(action.dateGraph.length),
      };
      for (let i = 0; i < action.dateGraph.length; i++) {
        if (i % action.numWorkers === action.workerIndex) {
          newState.totalTime[i] = action.dateGraph.totalTime[i];
          newState.totalCount[i] = action.dateGraph.totalCount[i];
        }
      }
      return newState;
    }
    default:
      return state;
  }
}

export const getDateGraph = (state: State): DateGraph => state.dateGraph;
