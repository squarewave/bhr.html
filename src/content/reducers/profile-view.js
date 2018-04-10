// @flow
import { combineReducers } from 'redux';
import { createSelector } from 'reselect';
import memoize from 'memoize-immutable';
import WeakTupleMap from 'weaktuplemap';
import * as UrlState from './url-state';
import * as ProfileData from '../profile-data';
import * as Transforms from '../transforms';
import * as ProfileTree from '../profile-tree';
import { arePathsEqual, PathSet } from '../../common/path';

import type {
  Profile,
  Thread,
  UsageHoursByDate,
  ThreadIndex,
  IndexIntoFuncTable,
  IndexIntoStackTable,
} from '../../common/types/profile';
import type { Days, StartEndRange } from '../../common/types/units';
import type { Action, ProfileSelection } from '../actions/types';
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
        expandedStacks: new PathSet(),
      }));
    case 'CHANGE_SELECTED_STACK': {
      const { selectedStack, threadIndex } = action;

      const threadState = state[threadIndex];
      const previousSelectedStack = threadState.selectedStack;

      // If the selected node doesn't actually change, let's return the previous
      // state to avoid rerenders.
      if (arePathsEqual(selectedStack, previousSelectedStack)) {
        return state;
      }

      let { expandedStacks } = threadState;

      /* Looking into the current state to know whether we want to generate a
       * new one. It can be expensive to clone when we have a lot of expanded
       * lines, but it's very infrequent that we actually want to expand new
       * lines as a result of a selection. */
      const selectedNodeParentPaths = [];
      for (let i = 1; i < selectedStack.length; i++) {
        selectedNodeParentPaths.push(selectedStack.slice(0, i));
      }
      const hasNewExpandedPaths = selectedNodeParentPaths.some(
        path => !expandedStacks.has(path)
      );

      if (hasNewExpandedPaths) {
        expandedStacks = new PathSet(expandedStacks);
        selectedNodeParentPaths.forEach(path =>
          expandedStacks.add(path)
        );
      }

      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], {
          selectedStack,
          expandedStacks,
        }),
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'CHANGE_EXPANDED_STACKS': {
      const { threadIndex, expandedStacks } = action;
      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], {
          expandedStacks: new PathSet(expandedStacks),
        }),
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'ADD_TRANSFORM_TO_STACK': {
      const { threadIndex, transform, transformedThread } = action;
      const expandedStacks = new PathSet(
        Array.from(state[threadIndex].expandedStacks)
          .map(path =>
            Transforms.applyTransformToFuncPath(
              path,
              transform,
              transformedThread
            )
          )
          .filter(path => path.length > 0)
      );

      const selectedStack = Transforms.applyTransformToFuncPath(
        state[threadIndex].selectedStack,
        transform,
        transformedThread
      );

      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], {
          selectedStack,
          expandedStacks,
        }),
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'POP_TRANSFORMS_FROM_STACK': {
      // Simply reset the selected and expanded paths until this bug is fixed:
      // https://github.com/devtools-html/perf.html/issues/882
      const { threadIndex } = action;
      return [
        ...state.slice(0, threadIndex),
        Object.assign({}, state[threadIndex], {
          selectedStack: [],
          expandedStacks: new PathSet(),
        }),
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
  UrlState.getRangeFilters,
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
  getRangeFilteredThread: State => Thread,
  getFilteredThread: State => Thread,
  getRangeSelectionFilteredThread: State => Thread,
  getSelectedStack: State => IndexIntoStackTable,
  getExpandedStacks: State => IndexIntoStackTable[],
  getPlatforms: State => string[],
  getCallTree: State => ProfileTree.ProfileTreeClass,
};

const selectorsForThreads: { [key: ThreadIndex]: SelectorsForThread } = {};
export const getUsageHoursByDate = (state: State): UsageHoursByDate => getProfile(state).usageHoursByDate;

export const selectorsForThread = (threadIndex: ThreadIndex): SelectorsForThread => {
  if (!(threadIndex in selectorsForThreads)) {
    const getThread = (state: State): Thread => getProfile(state).threads[threadIndex];
    const getViewOptions = (state: State): ThreadViewOptions => getProfileViewOptions(state).perThread[threadIndex];
    const getFriendlyThreadName = createSelector(
      getThreads,
      getThread,
      ProfileData.getFriendlyThreadName
    );
    const getRangeFilteredThread = createSelector(
      getThread,
      getUsageHoursByDate,
      getDisplayRange,
      (thread, usageHoursByDate, range): Thread => {
        const { start, end } = range;
        return ProfileData.filterThreadToRange(thread, usageHoursByDate, start, end);
      }
    );
    const applyTransform = (thread: Thread, transform: Transform) => {
      switch (transform.type) {
        case 'focus-subtree':
          return transform.inverted
            ? Transforms.focusInvertedSubtree(
                thread,
                transform.funcPath,
                transform.implementation
              )
            : Transforms.focusSubtree(
                thread,
                transform.funcPath,
                transform.implementation
              );
        case 'merge-path-into-caller':
          return Transforms.mergePathIntoCaller(
            thread,
            transform.funcPath,
            transform.implementation
          );
        case 'merge-function':
          return Transforms.mergeFunction(thread, transform.funcIndex);
        case 'drop-function':
          return Transforms.dropFunction(thread, transform.funcIndex);
        case 'focus-function':
          return Transforms.focusFunction(thread, transform.funcIndex);
        case 'collapse-lib':
          return Transforms.collapseLib(
            thread,
            transform.libIndex,
            transform.implementation
          );
        case 'collapse-direct-recursion':
          return Transforms.collapseDirectRecursion(
            thread,
            transform.funcIndex,
            transform.implementation
          );
        case 'collapse-function-subtree':
          return Transforms.collapseFunctionSubtree(
            thread,
            transform.funcIndex
          );
        default:
          throw assertExhaustiveCheck(transform);
      }
    };
    // It becomes very expensive to apply each transform over and over again as they
    // typically take around 100ms to run per transform on a fast machine. Memoize
    // memoize each step individually so that they transform stack can be pushed and
    // popped frequently and easily.
    const applyTransformMemoized = memoize(applyTransform, {
      cache: new WeakTupleMap(),
    });
    const getTransformStack = (state: State): TransformStack =>
      UrlState.getTransformStack(state, threadIndex);
    const getRangeAndTransformFilteredThread = createSelector(
      getRangeFilteredThread,
      getTransformStack,
      (startingThread, transforms): Thread => {
        const transformed = transforms.reduce(
          // Apply the reducer using an arrow function to ensure correct memoization.
          (thread, transform) => applyTransformMemoized(thread, transform),
          startingThread
        );
        return Transforms.postProcessTransforms(transformed);
      }
    );
    const getTransformLabels = createSelector(
      getRangeAndTransformFilteredThread,
      getFriendlyThreadName,
      getTransformStack,
      Transforms.getTransformLabels
    );
    const _getSearchFilteredThread = createSelector(
      getRangeAndTransformFilteredThread,
      UrlState.getSearchString,
      (thread, searchString): Thread => {
        return ProfileData.filterThreadToSearchString(thread, searchString);
      }
    );
    const _getCategoryFilteredThread = createSelector(
      _getSearchFilteredThread,
      UrlState.getCategoryFilter,
      (thread, categoryFilter): Thread => {
        return ProfileData.filterThreadToCategory(thread, categoryFilter);
      }
    );
    const _getPlatformFilteredThread = createSelector(
      _getCategoryFilteredThread,
      UrlState.getPlatformFilter,
      (thread, platformFilter): Thread => {
        return ProfileData.filterThreadToPlatform(thread, platformFilter);
      }
    );
    const _getRunnableFilteredThread = createSelector(
      _getPlatformFilteredThread,
      UrlState.getRunnableFilter,
      (thread, runnableFilter): Thread => {
        return ProfileData.filterThreadToRunnable(thread, runnableFilter);
      }
    );
    const _getUserInteractingFilteredThread = createSelector(
      _getRunnableFilteredThread,
      UrlState.getOnlyUserInteracting,
      (thread, onlyUserInteracting): Thread => {
        return onlyUserInteracting ? ProfileData.filterThreadToUserInteracting(thread, true) : thread;
      }
    );
    const getFilteredThread = createSelector(
      _getUserInteractingFilteredThread,
      UrlState.getInvertCallstack,
      (thread, shouldInvertCallstack): Thread => {
        return shouldInvertCallstack ? ProfileData.invertCallstack(thread) : thread;
      }
    );
    const getRangeSelectionFilteredThread = createSelector(
      getFilteredThread,
      getUsageHoursByDate,
      getProfileViewOptions,
      (thread, usageHoursByDate, viewOptions): Thread => {
        if (!viewOptions.selection.hasSelection) {
          return thread;
        }
        const { selectionStart, selectionEnd } = viewOptions.selection;
        return ProfileData.filterThreadToRange(thread, usageHoursByDate, selectionStart, selectionEnd);
      }
    );
    const getSelectedStackAsFuncArray = createSelector(
      getViewOptions,
      (threadViewOptions): IndexIntoFuncTable[] => threadViewOptions.selectedStack
    );
    const getSelectedStack = createSelector(
      getFilteredThread,
      getSelectedStackAsFuncArray,
      ({stackTable}, funcArray): IndexIntoStackTable => {
        return ProfileData.getStackFromFuncArray(funcArray, stackTable);
      }
    );
    const _getExpandedStacksAsFuncArrays = createSelector(
      getViewOptions,
      (threadViewOptions): Array<IndexIntoFuncTable[]> => Array.from(threadViewOptions.expandedStacks)
    );
    const getExpandedStacks = createSelector(
      getFilteredThread,
      _getExpandedStacksAsFuncArrays,
      ({stackTable}, funcArrays): IndexIntoStackTable[] => {
        return funcArrays.map(funcArray => ProfileData.getStackFromFuncArray(funcArray, stackTable));
      }
    );
    const getPlatforms = createSelector(
      getFilteredThread,
      ({sampleTable, stringTable}): string[] => {
        const mapped = sampleTable.platform.map(p => stringTable.getString(p));
        return sampleTable.platform ? Array.from(new Set(mapped)): [];
      }
    );
    const getCallTree = createSelector(
      getRangeSelectionFilteredThread,
      ProfileTree.getCallTree
    );

    selectorsForThreads[threadIndex] = {
      getThread,
      getUsageHoursByDate,
      getFriendlyThreadName,
      getViewOptions,
      getRangeFilteredThread,
      getRangeAndTransformFilteredThread,
      getFilteredThread,
      getRangeSelectionFilteredThread,
      getSelectedStackAsFuncArray,
      getSelectedStack,
      getExpandedStacks,
      getPlatforms,
      getCallTree,
      getTransformLabels,
    };
  }
  return selectorsForThreads[threadIndex];
};

export const selectedThreadSelectors: SelectorsForThread = (() => {
  const anyThreadSelectors: SelectorsForThread = selectorsForThread(0);
  const result: {[key: string]: State => any} = {};
  for (const key in anyThreadSelectors) {
    result[key] = (state: State) => selectorsForThread(UrlState.getSelectedThreadIndex(state))[key](state);
  }
  const result2: SelectorsForThread = result;
  return result2;
})();
