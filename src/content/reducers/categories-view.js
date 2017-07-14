/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Action } from '../types/actions';
import type { State, CategoriesViewState } from '../types/reducers';
import { getProfile } from './profile-view';
import { createSelector } from 'reselect';

export default function categoriesViewReducer(
  state: CategoriesViewState = { categories: null, expanded: null },
  action: Action
): CategoriesViewState {
  switch (action.type) {
    case 'PROFILE_CATEGORIES_PROCESSED': {
      return Object.assign({}, state, {
        categories: action.categories,
        expanded: new Set(),
      });
    }
    default:
      return state;
  }
}

export const getCategoriesView = (state: State): CategoriesViewState =>
  state.categoriesView;

export const getProfileCategories = createSelector(getCategoriesView, categoriesView => {
  return categoriesView.categories;
});

export const getProfileExpandedSummaries = createSelector(getCategoriesView, categoriesView => {
  return categoriesView.expanded;
});
