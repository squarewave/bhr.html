/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { summarizeProfileCategories } from '../../common/profile-categories';

export function processProfileCategories() {
  return function(dispatch, getState) {
    dispatch({
      toContent: true,
      type: 'PROFILE_CATEGORIES_PROCESSED',
      categories: summarizeProfileCategories(getState().profile),
    });
  };
}

export function profileProcessed(profile) {
  return {
    type: 'PROFILE_PROCESSED',
    profile: profile,
  };
}
