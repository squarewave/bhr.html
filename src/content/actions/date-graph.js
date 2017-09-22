// @flow
import type { Action } from './types';
import type { DateGraph } from '../../common/types/workers';

export function dateGraphRebuilt(dateGraph: DateGraph): Action {
  return {
    type: 'DATE_GRAPH_REBUILT',
    dateGraph,
  };
}
