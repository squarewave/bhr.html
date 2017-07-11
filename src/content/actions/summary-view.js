// @flow
import type {
  Action
} from './types';

export function changeCategoryFilter(category: string): Action {
  return {
    type: 'CHANGE_CATEGORY',
    category,
  };
}

export function profileSummaryProcessed(summary: object): Action {
  return {
    type: 'PROFILE_SUMMARY_PROCESSED',
    summary,
  };
}
