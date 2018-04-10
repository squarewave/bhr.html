// @flow
import type { Profile, Thread, ThreadIndex, IndexIntoFuncTable } from '../../common/types/profile';
import type { Transform } from '../../common/types/transforms';
import type { TrackedData } from '../../common/types/trackedData';
import type { DateGraph, CategorySummary } from '../../common/types/workers';
import type { State } from '../reducers/types';

export type ExpandedSet = Set<ThreadIndex>;
export type ProfileSelection =
  { hasSelection: false, isModifying: false } |
  {
    hasSelection: true,
    isModifying: boolean,
    selectionStart: number,
    selectionEnd: number,
  };
export type FuncToFuncMap = Map<IndexIntoFuncTable, IndexIntoFuncTable>;
export type FunctionsUpdatePerThread = { [id: ThreadIndex]: {
  oldFuncToNewFuncMap: FuncToFuncMap,
  funcIndices: IndexIntoFuncTable[],
  funcNames: string[],
}}

export type RequestedLib = { debugName: string, breakpadId: string };

type ProfileAction =
  { type: 'CHANGE_THREAD_ORDER', threadOrder: ThreadIndex[] } |
  { type: 'HIDE_THREAD', threadIndex: ThreadIndex } |
  { type: 'SHOW_THREAD', threads: Thread[], threadIndex: ThreadIndex } |
  { type: 'ASSIGN_TASK_TRACER_NAMES', addressIndices: number[], symbolNames: string[] } |
  { type: 'CHANGE_SELECTED_STACK', threadIndex: ThreadIndex, selectedStack: IndexIntoFuncTable[] } |
  { type: 'CHANGE_EXPANDED_STACKS', threadIndex: ThreadIndex, expandedStacks: Array<IndexIntoFuncTable[]> } |
  { type: 'UPDATE_PROFILE_SELECTION', selection: ProfileSelection } |
  { type: 'CHANGE_TAB_ORDER', tabOrder: number[] };

type ReceiveProfileAction =
  {
    type: 'COALESCED_FUNCTIONS_UPDATE',
    functionsUpdatePerThread: FunctionsUpdatePerThread,
  } |
  { type: 'DONE_SYMBOLICATING' } |
  { type: 'ERROR_RECEIVING_PROFILE_FROM_TELEMETRY', error: any } |
  { type: 'ERROR_RECEIVING_PROFILE_FROM_FILE', error: any } |
  { type: 'ERROR_RECEIVING_PROFILE_FROM_WEB', error: any } |
  { type: 'PROFILE_PROCESSED', profile: Profile, toWorker: true } |
  { type: "RECEIVE_PROFILE_FROM_ADDON", profile: Profile } |
  { type: "RECEIVE_PROFILE_FROM_FILE", profile: Profile } |
  { type: "RECEIVE_PROFILE_FROM_WEB", profile: Profile } |
  { type: "RECEIVE_PROFILE_FROM_TELEMETRY", profile: Profile } |
  { type: "RECEIVE_TRACKED_DATA_FROM_TELEMETRY", trackedData: TrackedData } |
  { type: 'REQUESTING_SYMBOL_TABLE', requestedLib: RequestedLib } |
  { type: 'RECEIVED_SYMBOL_TABLE_REPLY', requestedLib: RequestedLib } |
  { type: 'START_SYMBOLICATING' } |
  { type: 'WAITING_FOR_PROFILE_FROM_ADDON' } |
  { type: 'WAITING_FOR_PROFILE_FROM_WEB' };

type TimelineAction =
   { type: 'CHANGE_TIMELINE_EXPANDED_THREAD', threadIndex: ThreadIndex, isExpanded: boolean };

type URLEnhancerAction =
  { type: "@@urlenhancer/urlSetupDone" } |
  { type: '@@urlenhancer/updateURLState', urlState: any };

type URLStateAction =
  { type: 'WAITING_FOR_PROFILE_FROM_FILE' } |
  { type: 'WAITING_FOR_PROFILE_FROM_TELEMETRY', durationSpec: string, historical: boolean } |
  { type: 'WAITING_FOR_TRACKED_DATA_FROM_TELEMETRY' } |
  { type: 'PROFILE_PUBLISHED', hash: string } |
  { type: 'CHANGE_SELECTED_TAB', selectedTab: string } |
  { type: 'ADD_RANGE_FILTER', start: number, end: number } |
  { type: 'POP_RANGE_FILTERS', firstRemovedFilterIndex: number } |
  { type: 'CHANGE_SELECTED_THREAD', selectedThread: ThreadIndex } |
  { type: 'CHANGE_CALL_TREE_SEARCH_STRING', searchString: string } |
  { type: 'CHANGE_CATEGORY', category: string } |
  { type: 'CHANGE_RUNNABLE', runnable: string } |
  { type: 'CHANGE_PLATFORM', platform: string } |
  {
    type: 'ADD_TRANSFORM_TO_STACK',
    threadIndex: ThreadIndex,
    transform: Transform,
    transformedThread: Thread,
  } |
  {
    type: 'POP_TRANSFORMS_FROM_STACK',
    threadIndex: ThreadIndex,
    firstRemovedFilterIndex: number,
  } |
  { type: 'CHANGE_INVERT_CALLSTACK', invertCallstack: boolean } |
  { type: 'CHANGE_ONLY_USER_INTERACTING', onlyUserInteracting: boolean } |
  { type: 'CHANGE_HIDE_PLATFORM_DETAILS', hidePlatformDetails: boolean };

type IconsAction =
  { type: 'ICON_HAS_LOADED', icon: string } |
  { type: 'ICON_IN_ERROR', icon: string };

type WorkerAction =
  { type: 'PROFILE_PROCESSED', toSummaryWorker: boolean, profile: Profile } |
  { type: 'SUMMARIZE_PROFILE', toSummaryWorker: boolean } |
  { type: 'REBUILD_DATE_GRAPH', toDateGraphWorker: boolean, thread?: Thread, selectedStack: number } |
  { type: 'PROFILE_SUMMARY_EXPAND', threadIndex: number } |
  { type: 'DATE_GRAPH_REBUILT', dateGraph: DateGraph } |
  { type: 'PROFILE_CATEGORIES_PROCESSED', categories: CategorySummary[] } |
  { type: 'PROFILE_SUMMARY_COLLAPSE', threadIndex: number };

type RunnablesAction = 
  { type: 'PROFILE_RUNNABLES_PROCESSED', runnables: Object[] };

export type Action =
  ProfileAction |
  ReceiveProfileAction |
  TimelineAction |
  URLEnhancerAction |
  URLStateAction |
  RunnablesAction |
  WorkerAction |
  IconsAction;

export type GetState = () => State;
export type Dispatch = (Action | ThunkAction) => any;
export type ThunkAction = (Dispatch, GetState) => any;
