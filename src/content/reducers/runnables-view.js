/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Action } from '../actions/types';
import type { State, RunnablesViewState } from '../reducers/types';
import { getProfile } from './profile-view';
import { createSelector } from 'reselect';

export default function runnablesViewReducer(
  state: RunnablesViewState = { expanded: new Set(), runnables: [] },
  action: Action
): RunnablesViewState {
  switch (action.type) {
    case 'PROFILE_RUNNABLES_PROCESSED': {
      return Object.assign({}, state, {
        runnables: action.runnables,
        expanded: new Set(),
      });
    }
    case 'PROFILE_SUMMARY_EXPAND': {
      const expanded = new Set(state.expanded);
      expanded.add(action.threadIndex);
      return Object.assign({}, state, { expanded });
    }
    case 'PROFILE_SUMMARY_COLLAPSE': {
      const expanded = new Set(state.expanded);
      expanded.delete(action.threadIndex);
      return Object.assign({}, state, { expanded });
    }
    default:
      return state;
  }
}

export const getRunnablesView = (state: State): RunnablesViewState =>
  state.runnablesView;

export const getProfileRunnables = createSelector(getRunnablesView, runnablesView => {
  return runnablesView.runnables;
});

export const getProfileExpandedRunnables = createSelector(getRunnablesView, runnablesView => {
  return runnablesView.expanded;
});
