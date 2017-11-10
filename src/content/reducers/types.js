// @flow

import type {
  Action, ExpandedSet, CallTreeFiltersPerThread, ProfileSelection,
} from '../actions/types';
import type { Days, StartEndRange } from '../../common/types/units';
import type { IndexIntoFuncTable, Profile, ThreadIndex } from '../../common/types/profile';
import type { TrackedData } from '../../common/types/trackedData';
import type { DateGraph, CategorySummary } from '../../common/types/workers';

export type Reducer<T> = (T, Action) => T;

export type RequestedLib = { pdbName: string, breakpadId: string };
export type ThreadViewOptions = {
  selectedStack: IndexIntoFuncTable[],
  expandedStacks: Array<IndexIntoFuncTable[]>,
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

export type TrackedDataViewState = {
  trackedData: TrackedData,
};

export type AppState = {
  view: string,
  error: string,
  isURLSetupDone: boolean,
};

export type RangeFilterState = {
  start: number,
  end: number,
};

export type RunnablesViewState = {
  expanded: Set<number>,
  runnables: Object,
};

export type CategoriesViewState = {
  expanded: Set<number> | null,
  categories: CategorySummary[] | null,
};

export type URLState = {
  selectedTab: string,
  rangeFilters: RangeFilterState[],
  selectedThread: ThreadIndex,
  callTreeSearchString: string,
  callTreeFilters: CallTreeFiltersPerThread,
  invertCallstack: boolean,
  hidePlatformDetails: boolean,
  historical: boolean,
  durationSpec: string,
  runnableFilter: string | null,
  categoryFilter: string,
  platformFilter: string,
  onlyUserInteracting: boolean,
  payloadID: string | null,
  mode: string,
};

export type IconState = Set<string>;

export type State = {
  app: AppState,
  profileView: ProfileViewState,
  trackedDataView: TrackedDataViewState,
  runnablesView: RunnablesViewState,
  categoriesView: CategoriesViewState,
  urlState: URLState,
  dateGraph: DateGraph,
  icons: IconState,
};

export type IconWithClassName = {
  icon: string,
  className: string,
};
