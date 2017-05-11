// @flow
import type {
  Action,
  ThunkAction,
} from './types';
import type { Profile } from '../../common/types/profile';
import { UniqueStringArray } from '../unique-string-array';

export function waitingForProfileFromTelemetry(): Action {
  return {
    type: 'WAITING_FOR_PROFILE_FROM_TELEMETRY',
  };
}

export function receiveProfileFromTelemetry(profile: Profile): ThunkAction {
  return dispatch => {
    dispatch({
      type: 'RECEIVE_PROFILE_FROM_TELEMETRY',
      profile,
    });
  };
}

export function errorReceivingProfileFromTelemetry(error: any): Action {
  return {
    type: 'ERROR_RECEIVING_PROFILE_FROM_TELEMETRY',
    error,
  };
}

export function retrieveProfileFromTelemetry(): ThunkAction {
  return dispatch => {
    dispatch(waitingForProfileFromTelemetry());

    const TELEMETRY_PROFILE_URL = 'https://analysis-output.telemetry.mozilla.org/bhr/data/hang_aggregates/hang_profile.json';

    fetch(TELEMETRY_PROFILE_URL).then(res => {
      return res.json();
    }).then(profile => {
      for (let thread of profile.threads) {
        thread.dates.sort((lhs, rhs) => lhs.date - rhs.date);
        thread.dates = thread.dates.map(d => {
          let stackHangMs = new Float32Array(thread.stackTable.length);
          let stackHangCount = new Int32Array(thread.stackTable.length);
          let totalStackHangMs = new Float32Array(thread.stackTable.length);
          let totalStackHangCount = new Int32Array(thread.stackTable.length);

          for (let i = thread.stackTable.length - 1; i >= 0; i--) {
            stackHangMs[i] = d.stackHangMs[i] || 0;
            stackHangCount[i] = d.stackHangCount[i] || 0;
            totalStackHangMs[i] += stackHangMs[i];
            totalStackHangCount[i] += stackHangCount[i];
            const prefix = thread.stackTable.prefix[i];
            if (prefix !== null) {
              totalStackHangMs[prefix] += totalStackHangMs[i];
              totalStackHangCount[prefix] += totalStackHangCount[i];
            }
          }

          return  {
            date: d.date,
            length: thread.stackTable.length,
            stackHangMs,
            stackHangCount,
            totalStackHangCount,
            totalStackHangMs,
          };
        });

        thread.stringTable = new UniqueStringArray(thread.stringArray);
      }
      dispatch(receiveProfileFromTelemetry(profile));
    }).catch(error => {
      dispatch(errorReceivingProfileFromTelemetry(error));
    });
  };
}
