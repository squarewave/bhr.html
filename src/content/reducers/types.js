// @flow

import type {
  Action, ExpandedSet, CallTreeFiltersPerThread, ProfileSelection,
  ImplementationFilter,
} from '../actions/types';
import type { Days, StartEndRange } from '../../common/types/units';
import type { IndexIntoFuncTable, Profile, ThreadIndex } from '../../common/types/profile';

export type Reducer<T> = (T, Action) => T;

export type RequestedLib = { pdbName: string, breakpadId: string };
export type ThreadViewOptions = {
  selectedFuncStack: IndexIntoFuncTable[],
  expandedFuncStacks: Array<IndexIntoFuncTable[]>,
};
export type ProfileViewState = {
  viewOptions: {
    threadOrder: number[],
    perThread: ThreadViewOptions[],
    selection: ProfileSelection,
    scrollToSelectionGeneration: number,
    rootRange: StartEndRange,
    zeroAt: Days,
  },
  profile: Profile,
};

export type AppState = {
  view: string,
  isURLSetupDone: boolean,
};

export type RangeFilterState = {
  start: number,
  end: number,
};

export type URLState = {
  hash: string,
  selectedTab: string,
  rangeFilters: RangeFilterState[],
  selectedThread: ThreadIndex,
  callTreeSearchString: string,
  callTreeFilters: CallTreeFiltersPerThread,
  implementation: ImplementationFilter,
  invertCallstack: boolean,
  hidePlatformDetails: boolean,
};

export type IconState = Set<string>;

export type State = {
  app: AppState,
  profileView: ProfileViewState,
  urlState: URLState,
  icons: IconState,
};

export type IconWithClassName = {
  icon: string,
  className: string,
};
