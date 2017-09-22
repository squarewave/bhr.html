/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import { combineReducers } from 'redux';
import type { Action } from '../../content/actions/types';
import type { Profile } from '../../common/types/profile';
import type { CategorySummary } from '../../common/types/workers';

function profile(state = null, action: Action): Profile | null {
  switch (action.type) {
    case 'PROFILE_PROCESSED':
      return action.profile;
    default:
      return state;
  }
}

function categories(state = null, action: Action): CategorySummary[] | null {
  switch (action.type) {
    case 'PROFILE_CATEGORIES_PROCESSED':
      return action.categories;
    default:
      return state;
  }
}

export default combineReducers({
  profile,
  categories,
});
