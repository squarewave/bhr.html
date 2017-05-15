// @flow
import { combineReducers } from 'redux';
import { createSelector } from 'reselect';
import * as CallTreeFilters from '../call-tree-filters';
import * as URLState from './url-state';
import * as ProfileData from '../profile-data';
import * as ProfileTree from '../profile-tree';

import type {
  Profile,
  Thread,
  ThreadIndex,
  IndexIntoFuncTable,
  IndexIntoStackTable,
} from '../../common/types/profile';
import type { Days, StartEndRange } from '../../common/types/units';
import type { Action, CallTreeFilter, ProfileSelection } from '../actions/types';
import type {
  State,
  Reducer,
  ProfileViewState,
  RequestedLib,
  ThreadViewOptions,
} from './types';

function profile(state: Profile = ProfileData.getEmptyProfile(), action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return action.profile;
    default:
      return state;
  }
}

function stackAfterCallTreeFilter(funcArray: IndexIntoFuncTable[], filter: CallTreeFilter) {
  if (filter.type === 'prefix' && !filter.matchJSOnly) {
    return removePrefixFromFuncArray(filter.prefixFuncs, funcArray);
  }
  return funcArray;
}

function removePrefixFromFuncArray(prefixFuncs: IndexIntoFuncTable[], funcArray: IndexIntoFuncTable[]) {
  if (prefixFuncs.length > funcArray.length ||
      prefixFuncs.some((prefixFunc, i) => prefixFunc !== funcArray[i])) {
    return [];
  }
  return funcArray.slice(prefixFuncs.length - 1);
}

function threadOrder(state: ThreadIndex[] = [], action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return ProfileData.defaultThreadOrder(action.profile.threads);
    case 'CHANGE_THREAD_ORDER':
      return action.threadOrder;
    case 'HIDE_THREAD': {
      const { threadIndex } = action;
      return state.filter(i => i !== threadIndex);
    }
    case 'SHOW_THREAD': {
      // There is a little bit of complexity here, due to deciding (on a potentially
      // re-sorted list) where to actually insert a thread. This strategy tries to
      // place it back in the list based on the original sort order.
      const defaultThreadOrder = ProfileData.defaultThreadOrder(action.threads);
      const originalOrderIndex = defaultThreadOrder.indexOf(action.threadIndex);

      let previousThreadIndex;
      for (let orderIndex = 0; orderIndex < defaultThreadOrder.length; orderIndex++) {
        const threadIndex = defaultThreadOrder[orderIndex];
        if (!state.includes(threadIndex)) {
          continue;
        }
        if (orderIndex > originalOrderIndex) {
          break;
        }
        previousThreadIndex = threadIndex;
      }

      const insertionIndex = previousThreadIndex === undefined
        // Insert at the beginning.
        ? 0
        // Insert after
        : state.indexOf(previousThreadIndex) + 1;

      const newState = state.slice();
      newState.splice(insertionIndex, 0, action.threadIndex);

      return newState;
    }
    default:
      return state;
  }
}

function viewOptionsPerThread(state: ThreadViewOptions[] = [], action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return action.profile.threads.map(() => ({
        selectedStack: [],
        expandedStacks: [],
      }));
    case 'CHANGE_SELECTED_STACK': {
      const { selectedStack, threadIndex } = action;
      const expandedStacks = state[threadIndex].expandedStacks.slice();
      for (let i = 1; i < selectedStack.length; i++) {
        expandedStacks.push(selectedStack.slice(0, i));
      }
      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], { selectedStack, expandedStacks }),
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'CHANGE_EXPANDED_STACKS': {
      const { threadIndex, expandedStacks } = action;
      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], { expandedStacks }),
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'ADD_CALL_TREE_FILTER': {
      const { threadIndex, filter } = action;
      const expandedStacks = state[threadIndex].expandedStacks.map(fs => stackAfterCallTreeFilter(fs, filter));
      const selectedStack = stackAfterCallTreeFilter(state[threadIndex].selectedStack, filter);
      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], { selectedStack, expandedStacks }),
        ...state.slice(threadIndex + 1),
      ];
    }
    default:
      return state;
  }
}

function selection(state: ProfileSelection = { hasSelection: false, isModifying: false }, action: Action) { // TODO: Rename to timeRangeSelection
  switch (action.type) {
    case 'UPDATE_PROFILE_SELECTION':
      return action.selection;
    default:
      return state;
  }
}

function scrollToSelectionGeneration(state: number = 0, action: Action) {
  switch (action.type) {
    case 'CHANGE_INVERT_CALLSTACK':
    case 'CHANGE_SELECTED_STACK':
    case 'CHANGE_SELECTED_THREAD':
      return state + 1;
    default:
      return state;
  }
}

function rootRange(state: StartEndRange = { start: 0, end: 1 }, action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return ProfileData.getTimeRangeIncludingAllThreads(action.profile);
    default:
      return state;
  }
}

function zeroAt(state: Days = 0, action: Action) {
  switch (action.type) {
    case 'RECEIVE_PROFILE_FROM_TELEMETRY':
      return ProfileData.getTimeRangeIncludingAllThreads(action.profile).start;
    default:
      return state;
  }
}

const profileViewReducer: Reducer<ProfileViewState> = combineReducers({
  viewOptions: combineReducers({
    perThread: viewOptionsPerThread,
    threadOrder,
    selection, scrollToSelectionGeneration, rootRange, zeroAt,
  }),
  profile,
});
export default profileViewReducer;

export const getProfileView = (state: State): ProfileViewState => state.profileView;

/**
 * Profile View Options
 */
export const getProfileViewOptions = (state: State) => getProfileView(state).viewOptions;

export const getScrollToSelectionGeneration = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.scrollToSelectionGeneration
);

export const getZeroAt = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.zeroAt
);

export const getThreadOrder = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.threadOrder
);

export const getDisplayRange = createSelector(
  (state: State) => getProfileViewOptions(state).rootRange,
  (state: State) => getProfileViewOptions(state).zeroAt,
  URLState.getRangeFilters,
  (rootRange, zeroAt, rangeFilters): StartEndRange => {
    if (rangeFilters.length > 0) {
      let { start, end } = rangeFilters[rangeFilters.length - 1];
      start += zeroAt;
      end += zeroAt;
      return { start, end };
    }
    return rootRange;
  }
);

/**
 * Profile
 */
export const getProfile = (state: State): Profile => getProfileView(state).profile;
export const getThreads = (state: State): Thread[] => getProfile(state).threads;
export const getThreadNames = (state: State): string[] => getProfile(state).threads.map(t => t.name);

export type SelectorsForThread = {
  getThread: State => Thread,
  getFriendlyThreadName: State => string,
  getViewOptions: State => ThreadViewOptions,
  getCallTreeFilters: State => CallTreeFilter[],
  getCallTreeFilterLabels: State => string[],
  getRangeFilteredThread: State => Thread,
  getFilteredThread: State => Thread,
  getRangeSelectionFilteredThread: State => Thread,
  getSelectedStack: State => IndexIntoStackTable,
  getExpandedStacks: State => IndexIntoStackTable[],
  getCallTree: State => ProfileTree.ProfileTreeClass,
};

const selectorsForThreads: { [key: ThreadIndex]: SelectorsForThread } = {};

export const selectorsForThread = (threadIndex: ThreadIndex): SelectorsForThread => {
  if (!(threadIndex in selectorsForThreads)) {
    const getThread = (state: State): Thread => getProfile(state).threads[threadIndex];
    const getViewOptions = (state: State): ThreadViewOptions => getProfileViewOptions(state).perThread[threadIndex];
    const getCallTreeFilters = (state: State): CallTreeFilter[] => URLState.getCallTreeFilters(state, threadIndex);
    const getFriendlyThreadName = createSelector(
      getThreads,
      getThread,
      ProfileData.getFriendlyThreadName
    );
    const getCallTreeFilterLabels: (state: State) => string[] = createSelector(
      getThread,
      getCallTreeFilters,
      CallTreeFilters.getCallTreeFilterLabels
    );
    const getRangeFilteredThread = createSelector(
      getThread,
      getDisplayRange,
      (thread, range): Thread => {
        const { start, end } = range;
        return ProfileData.filterThreadToRange(thread, start, end);
      }
    );
    const _getRangeAndCallTreeFilteredThread = createSelector(
      getRangeFilteredThread,
      getCallTreeFilters,
      (thread, callTreeFilters): Thread => {
        const result = callTreeFilters.reduce((t, filter) => {
          switch (filter.type) {
            case 'prefix':
              return ProfileData.filterThreadToPrefixStack(t, filter.prefixFuncs, filter.matchJSOnly);
            case 'postfix':
              return ProfileData.filterThreadToPostfixStack(t, filter.postfixFuncs, filter.matchJSOnly);
            default:
              throw new Error('unhandled call tree filter');
          }
        }, thread);
        return result;
      }
    );
    const _getImplementationAndSearchFilteredThread = createSelector(
      _getRangeAndCallTreeFilteredThread,
      URLState.getSearchString,
      (thread, searchString): Thread => {
        return ProfileData.filterThreadToSearchString(thread, searchString);
      }
    );
    const getFilteredThread = createSelector(
      _getImplementationAndSearchFilteredThread,
      URLState.getInvertCallstack,
      (thread, shouldInvertCallstack): Thread => {
        return shouldInvertCallstack ? ProfileData.invertCallstack(thread) : thread;
      }
    );
    const getRangeSelectionFilteredThread = createSelector(
      getFilteredThread,
      getProfileViewOptions,
      (thread, viewOptions): Thread => {
        if (!viewOptions.selection.hasSelection) {
          return thread;
        }
        const { selectionStart, selectionEnd } = viewOptions.selection;
        return ProfileData.filterThreadToRange(thread, selectionStart, selectionEnd);
      }
    );
    const _getSelectedStackAsFuncArray = createSelector(
      getViewOptions,
      (threadViewOptions): IndexIntoFuncTable[] => threadViewOptions.selectedStack
    );
    const getSelectedStack = createSelector(
      getFilteredThread,
      _getSelectedStackAsFuncArray,
      ({stackTable}, funcArray): IndexIntoStackTable => {
        return ProfileData.getStackFromFuncArray(funcArray, stackTable);
      }
    );
    const _getExpandedStacksAsFuncArrays = createSelector(
      getViewOptions,
      (threadViewOptions): Array<IndexIntoFuncTable[]> => threadViewOptions.expandedStacks
    );
    const getExpandedStacks = createSelector(
      getFilteredThread,
      _getExpandedStacksAsFuncArrays,
      ({stackTable}, funcArrays): IndexIntoStackTable[] => {
        return funcArrays.map(funcArray => ProfileData.getStackFromFuncArray(funcArray, stackTable));
      }
    );
    const getCallTree = createSelector(
      getRangeSelectionFilteredThread,
      ProfileTree.getCallTree
    );

    selectorsForThreads[threadIndex] = {
      getThread,
      getFriendlyThreadName,
      getViewOptions,
      getCallTreeFilters,
      getCallTreeFilterLabels,
      getRangeFilteredThread,
      getFilteredThread,
      getRangeSelectionFilteredThread,
      getSelectedStack,
      getExpandedStacks,
      getCallTree,
    };
  }
  return selectorsForThreads[threadIndex];
};

export const selectedThreadSelectors: SelectorsForThread = (() => {
  const anyThreadSelectors: SelectorsForThread = selectorsForThread(0);
  const result: {[key: string]: State => any} = {};
  for (const key in anyThreadSelectors) {
    result[key] = (state: State) => selectorsForThread(URLState.getSelectedThreadIndex(state))[key](state);
  }
  const result2: SelectorsForThread = result;
  return result2;
})();
