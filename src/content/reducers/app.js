// @flow
import { combineReducers } from 'redux';

import type { Action } from '../actions/types';
import type { State, AppState, Reducer } from './types';

function view(state: string = 'INITIALIZING', action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return 'PROFILE';
    default:
      return state;
  }
}

function isURLSetupDone(state: boolean = false, action: Action) {
  switch (action.type) {
    case '@@urlenhancer/urlSetupDone':
      return true;
    default:
      return state;
  }
}

const appStateReducer: Reducer<AppState> = combineReducers({ view, isURLSetupDone });
export default appStateReducer;

export const getApp = (state: State): AppState => state.app;
export const getView = (state: State): string => getApp(state).view;
export const getIsURLSetupDone = (state: State): boolean => getApp(state).isURLSetupDone;
