// @flow
import type {
  Action,
  ThunkAction,
} from './types';
import type { Profile } from '../../common/types/profile';
import { UniqueStringArray } from '../unique-string-array';
import { OneToManyIndex } from '../one-to-many-index';

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

    dispatch({
      toSummaryWorker: true,
      type: 'PROFILE_PROCESSED',
      profile: profile,
    });

    dispatch({
      toSummaryWorker: true,
      type: 'SUMMARIZE_PROFILE',
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

    const TELEMETRY_PROFILE_URL = 'https://analysis-output.telemetry.mozilla.org/bhr/data/hang_aggregates/hang_profile_2.json';

    fetch(TELEMETRY_PROFILE_URL).then(res => {
      return res.json();
    }).then(profile => {

      function union(setA, setB) {
          let union = new Set();
          for (let elem of setA) {
            union.add(elem);
          }
          for (let elem of setB) {
            union.add(elem);
          }
          return union;
      }

      let allDates;
      if (profile.threads.length !== 0) {
        let dateSets = profile.threads.map(t => new Set(t.dates.map(d => d.date)));
        allDates = dateSets[0];
        dateSets.slice(1).forEach(ds => {
          allDates = union(allDates, ds);
        });
      } else {
        allDates = new Set();
      }

      for (let thread of profile.threads) {
        {
          let prefix = new Int32Array(thread.stackTable.length);
          let func = new Int32Array(thread.stackTable.length);
          let depth = new Int32Array(thread.stackTable.length);
          for (let i = 0; i < thread.stackTable.length; i++) {
            if (thread.stackTable.prefix[i] === null) {
              prefix[i] = -1;
              depth[i] = 0;
            } else {
              prefix[i] = thread.stackTable.prefix[i];
              depth[i] = 1 + depth[prefix[i]];
            }
            func[i] = thread.stackTable.func[i];
          }

          Object.assign(thread.stackTable, {
            prefix,
            func,
            depth,
          });
        }

        {
          let prefix = new Int32Array(thread.pseudoStackTable.length);
          let func = new Int32Array(thread.pseudoStackTable.length);
          for (let i = 0; i < thread.pseudoStackTable.length; i++) {
            if (thread.pseudoStackTable.prefix[i] === null) {
              prefix[i] = -1;
            } else {
              prefix[i] = thread.pseudoStackTable.prefix[i];
            }
            func[i] = thread.pseudoStackTable.func[i];
          }

          Object.assign(thread.pseudoStackTable, {
            prefix,
            func,
          });
        }

        thread.dates = Array.from(allDates).map(date => {
          let threadDate = thread.dates.find(d => d.date === date);
          let stackHangMs = new Float32Array(thread.stackTable.length);
          let stackHangCount = new Float32Array(thread.stackTable.length);
          let totalStackHangMs = new Float32Array(thread.stackTable.length);
          let totalStackHangCount = new Float32Array(thread.stackTable.length);

          if (threadDate) {
            for (let i = thread.stackTable.length - 1; i >= 0; i--) {
              stackHangMs[i] = threadDate.stackHangMs[i] || 0;
              stackHangCount[i] = threadDate.stackHangCount[i] || 0;
              totalStackHangMs[i] += stackHangMs[i];
              totalStackHangCount[i] += stackHangCount[i];
              const prefix = thread.stackTable.prefix[i];
              if (prefix !== -1) {
                totalStackHangMs[prefix] += totalStackHangMs[i];
                totalStackHangCount[prefix] += totalStackHangCount[i];
              }
            }
          }

          return  {
            length: thread.stackTable.length,
            date,
            stackHangMs,
            stackHangCount,
            totalStackHangCount,
            totalStackHangMs,
          };
        });

        thread.dates.sort((lhs, rhs) => lhs.date - rhs.date);
        thread.stackToPseudoStacksIndex = new OneToManyIndex(thread.stackToPseudoStacksTable.stack);
        thread.stringTable = new UniqueStringArray(thread.stringArray);
      }

      if (profile.threads.length !== 0) {
        profile.dates = profile.threads[0].dates.map(d => d.date);
      } else {
        profile.dates = [];
      }

      dispatch(receiveProfileFromTelemetry(profile));
    }).catch(error => {
      dispatch(errorReceivingProfileFromTelemetry(error));
    });
  };
}
