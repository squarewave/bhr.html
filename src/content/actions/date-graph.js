// @flow
import type {
  Action
} from './types';

export function dateGraphRebuilt(dateGraph: object): Action {
  return {
    type: 'DATE_GRAPH_REBUILT',
    dateGraph,
  };
}
