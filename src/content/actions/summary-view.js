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
