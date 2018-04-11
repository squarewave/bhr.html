// @flow
import type {
  Action, ThunkAction, ProfileSelection
} from './types';
import type { Thread, ThreadIndex, IndexIntoFuncTable, } from '../../common/types/profile';
import { selectedThreadSelectors, selectorsForThread } from '../reducers/profile-view';
import { getSelectedThreadIndex } from '../reducers/url-state';

/**
 * The actions that pertain to changing the view on the profile, including searching
 * and filtering. Currently the call tree's actions are in this file, but should be
 * split apart. These actions should most likely affect every panel.
 */
export function changeSelectedStack(
  threadIndex: ThreadIndex,
  selectedStack: IndexIntoFuncTable[]
): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_SELECTED_STACK',
      selectedStack, threadIndex,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function changeThreadOrder(threadOrder: ThreadIndex[]): Action {
  return {
    type: 'CHANGE_THREAD_ORDER',
    threadOrder,
  };
}

export function hideThread(threadIndex: ThreadIndex): Action {
  return {
    type: 'HIDE_THREAD',
    threadIndex,
  };
}

export function showThread(threads: Thread[], threadIndex: ThreadIndex): Action {
  return {
    type: 'SHOW_THREAD',
    threads,
    threadIndex,
  };
}

export function changeSelectedThread(selectedThread: ThreadIndex): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_SELECTED_THREAD',
      selectedThread,
    });

    dispatch({
      type: 'REBUILD_TOTAL_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getThread(getState()),
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function changeCallTreeSearchString(searchString: string): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_CALL_TREE_SEARCH_STRING',
      searchString,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function changeExpandedStacks(
  threadIndex: ThreadIndex,
  expandedStacks: Array<IndexIntoFuncTable[]>
): Action {
  return {
    type: 'CHANGE_EXPANDED_STACKS',
    threadIndex, expandedStacks,
  };
}

export function changeInvertCallstack(invertCallstack: boolean): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_INVERT_CALLSTACK',
      invertCallstack,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function changeOnlyUserInteracting(onlyUserInteracting: boolean): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_ONLY_USER_INTERACTING',
      onlyUserInteracting,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function changeRunnableFilter(runnable: string) : ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_RUNNABLE',
      runnable,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  }
}

export function changeCategoryFilter(category: string): ThunkAction {
  return (dispatch, getState) => {
    dispatch({
      type: 'CHANGE_CATEGORY',
      category,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  }
}

export function changePlatformFilter(platform: string): Action {
  return {
    type: 'CHANGE_PLATFORM',
    platform,
  };
}

export function changeHidePlatformDetails(hidePlatformDetails: boolean): Action {
  return {
    type: 'CHANGE_HIDE_PLATFORM_DETAILS',
    hidePlatformDetails,
  };
}

export type UpdateProfileSelection = (selection: ProfileSelection) => Action;

export function updateProfileSelection(selection: ProfileSelection): Action {
  return {
    type: 'UPDATE_PROFILE_SELECTION',
    selection,
  };
}

export function addRangeFilter(start: number, end: number): Action {
  return {
    type: 'ADD_RANGE_FILTER',
    start, end,
  };
}

export function addRangeFilterAndUnsetSelection(start: number, end: number): ThunkAction {
  return dispatch => {
    dispatch(addRangeFilter(start, end));
    dispatch(updateProfileSelection({ hasSelection: false, isModifying: false }));
  };
}

export function popRangeFilters(firstRemovedFilterIndex: number): Action {
  return {
    type: 'POP_RANGE_FILTERS',
    firstRemovedFilterIndex,
  };
}

export function popRangeFiltersAndUnsetSelection(firstRemovedFilterIndex: number): ThunkAction {
  return dispatch => {
    dispatch(popRangeFilters(firstRemovedFilterIndex));
    dispatch(updateProfileSelection({ hasSelection: false, isModifying: false }));
  };
}

export function addTransformToStack(
  threadIndex: ThreadIndex,
  transform: Transform
): ThunkAction<void> {
  return (dispatch, getState) => {
    const selectors = selectorsForThread(threadIndex);
    const transformedThread = selectors.getRangeAndTransformFilteredThread(getState());

    dispatch({
      type: 'ADD_TRANSFORM_TO_STACK',
      threadIndex,
      transform,
      transformedThread,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}

export function popTransformsFromStack(
  firstRemovedFilterIndex: number
): ThunkAction<void> {
  return (dispatch, getState) => {
    const threadIndex = getSelectedThreadIndex(getState());
    dispatch({
      type: 'POP_TRANSFORMS_FROM_STACK',
      threadIndex,
      firstRemovedFilterIndex,
    });

    dispatch({
      type: 'REBUILD_DATE_GRAPH',
      toDateGraphWorker: true,
      thread: selectedThreadSelectors.getFilteredThread(getState()),
      selectedStack: selectedThreadSelectors.getSelectedStack(getState()),
    });
  };
}
