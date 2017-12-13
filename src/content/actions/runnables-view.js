/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type {
  Action
} from './types';

export function profileRunnablesProcessed(runnables: Object[]): Action {
  return {
    type: 'PROFILE_RUNNABLES_PROCESSED',
    runnables,
  };
}

export function expandRunnablesThread(threadIndex: number): Action {
  return {
    type: 'PROFILE_SUMMARY_EXPAND',
    threadIndex,
  };
}

export function collapseRunnablesThread(threadIndex: number): Action {
  return {
    type: 'PROFILE_SUMMARY_COLLAPSE',
    threadIndex,
  };
}
