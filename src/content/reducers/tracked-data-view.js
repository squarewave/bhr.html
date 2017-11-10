// @flow
import { combineReducers } from 'redux';
import { createSelector } from 'reselect';
import * as URLState from './url-state';

import type { TrackedData } from '../../common/types/trackedData'
import type { Action } from '../actions/types';
import type {
  State,
  Reducer,
  TrackedDataViewState,
} from './types';

function trackedData(state: TrackedData = [], action: Action) {
  switch (action.type) {
    case 'RECEIVE_TRACKED_DATA_FROM_TELEMETRY':
      return action.trackedData;
    default:
      return state;
  }
}

const trackedDataReducer: Reducer<TrackedDataViewState> = combineReducers({
  trackedData,
});
export default trackedDataReducer;

export const getTrackedData = (state: State): TrackedData => state.trackedDataView.trackedData;
