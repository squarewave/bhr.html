// @flow
import { combineReducers } from 'redux';

import type { Action } from '../actions/types';
import type { State, AppState, Reducer } from './types';

function view(state: string = 'INITIALIZING', action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return 'PROFILE';
    case 'WAITING_FOR_PROFILE_FROM_TELEMETRY':
      return 'INITIALIZING';
    case 'ERROR_RECEIVING_PROFILE_FROM_TELEMETRY':
      return 'ERROR';
    default:
      return state;
  }
}

function error(state: string = '', action: Action) {
  switch (action.type) {
    case 'ERROR_RECEIVING_PROFILE_FROM_TELEMETRY':
      return action.error;
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

const appStateReducer: Reducer<AppState> = combineReducers({ view, error, isURLSetupDone });
export default appStateReducer;

export const getApp = (state: State): AppState => state.app;
export const getView = (state: State): string => getApp(state).view;
export const getError = (state: State): string => getApp(state).error;
export const getIsURLSetupDone = (state: State): boolean => getApp(state).isURLSetupDone;
