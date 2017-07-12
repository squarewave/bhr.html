/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Action } from '../types/actions';
import { getProfile } from './profile-view';
import { createSelector } from 'reselect';

export default function dateGraphReducer(
  state = { length: 0, totalTime: [], totalCount: [] },
  action: Action
) {
  switch (action.type) {
    case 'DATE_GRAPH_REBUILT': {
      return action.dateGraph;
    }
    default:
      return state;
  }
}

export const getDateGraph = state => state.dateGraph;
