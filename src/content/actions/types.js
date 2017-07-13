// @flow
import type { Profile, Thread, ThreadIndex, IndexIntoFuncTable } from '../../common/types/profile';
import type { State } from '../reducers/types';

export type ExpandedSet = Set<ThreadIndex>;
export type PrefixCallTreeFilter = {
  type: 'prefix',
  prefixFuncs: IndexIntoFuncTable[],
};
export type PostfixCallTreeFilter = {
  type: 'postfix',
  postfixFuncs: IndexIntoFuncTable[],
};
export type CallTreeFilter = PrefixCallTreeFilter | PostfixCallTreeFilter;
export type CallTreeFiltersPerThread = { [id: ThreadIndex]: CallTreeFilter[] };
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
  { type: 'WAITING_FOR_PROFILE_FROM_TELEMETRY', durationSpec: string } |
  { type: 'PROFILE_PUBLISHED', hash: string } |
  { type: 'CHANGE_SELECTED_TAB', selectedTab: string } |
  { type: 'ADD_RANGE_FILTER', start: number, end: number } |
  { type: 'POP_RANGE_FILTERS', firstRemovedFilterIndex: number } |
  { type: 'CHANGE_SELECTED_THREAD', selectedThread: ThreadIndex } |
  { type: 'CHANGE_CALL_TREE_SEARCH_STRING', searchString: string } |
  { type: 'CHANGE_CATEGORY', category: string } |
  { type: 'CHANGE_RUNNABLE', runnable: string } |
  { type: 'ADD_CALL_TREE_FILTER', threadIndex: ThreadIndex, filter: CallTreeFilter } |
  { type: 'POP_CALL_TREE_FILTERS', threadIndex: ThreadIndex, firstRemovedFilterIndex: number } |
  { type: 'CHANGE_INVERT_CALLSTACK', invertCallstack: boolean } |
  { type: 'CHANGE_HIDE_PLATFORM_DETAILS', hidePlatformDetails: boolean };

type IconsAction =
  { type: 'ICON_HAS_LOADED', icon: string } |
  { type: 'ICON_IN_ERROR', icon: string };

export type Action =
  ProfileAction |
  ReceiveProfileAction |
  TimelineAction |
  URLEnhancerAction |
  URLStateAction |
  IconsAction;

export type GetState = () => State;
export type Dispatch = (Action | ThunkAction) => any;
export type ThunkAction = (Dispatch, GetState) => any;
