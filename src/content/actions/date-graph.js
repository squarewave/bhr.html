// @flow
import type { Action } from './types';
import type { DateGraph } from '../../common/types/workers';

export function dateGraphRebuilt(dateGraph: DateGraph, workerIndex: number, numWorkers: number): Action {
  return {
    type: 'DATE_GRAPH_REBUILT',
    dateGraph,
    workerIndex,
    numWorkers,
  };
}
