// @flow
import type {
  Action
} from './types';
import type { CategorySummary } from '../../common/types/workers';

export function profileCategoriesProcessed(categories: CategorySummary[]): Action {
  return {
    type: 'PROFILE_CATEGORIES_PROCESSED',
    categories,
  };
}
