// @flow
import type {
  Action
} from './types';

export function profileCategoriesProcessed(categories: object): Action {
  return {
    type: 'PROFILE_CATEGORIES_PROCESSED',
    categories,
  };
}
