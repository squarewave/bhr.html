// @flow
import queryString from 'query-string';
import { stringifyRangeFilters, parseRangeFilters } from './range-filters';
import { stringifyCallTreeFilters, parseCallTreeFilters } from './call-tree-filters';
import type { URLState } from './reducers/types';

export function urlFromState(urlState: URLState) {
  const pathname = '/';

  // Start with the query parameters that are shown regardless of the active tab.
  const query: Object = {
    range: stringifyRangeFilters(urlState.rangeFilters) || undefined,
    thread: `${urlState.selectedThread}`,
  };

  query.search = urlState.callTreeSearchString || undefined;
  query.invertCallstack = urlState.invertCallstack ? null : undefined;
  query.callTreeFilters = stringifyCallTreeFilters(urlState.callTreeFilters[urlState.selectedThread]) || undefined;
  query.category = urlState.categoryFilter || undefined;
  query.platform = urlState.platformFilter || undefined;
  query.runnable = urlState.runnableFilter || undefined;
  query.durationSpec = urlState.durationSpec || undefined;
  query.onlyUserInteracting = urlState.onlyUserInteracting || undefined;
  query.payloadID = urlState.payloadID || undefined;
  const qString = queryString.stringify(query);
  return pathname + (qString ? '?' + qString : '');
}

export function stateFromCurrentLocation(): URLState {
  const pathname = window.location.pathname;
  const qString = window.location.search.substr(1);
  const hash = window.location.hash;
  const query = queryString.parse(qString);

  const selectedThread = query.thread !== undefined ? +query.thread : 0;

  return {
    hash: '',
    selectedTab: 'calltree',
    durationSpec: query.durationSpec || '2048_65536',
    payloadID: query.payloadID,
    rangeFilters: query.range ? parseRangeFilters(query.range) : [],
    selectedThread: selectedThread,
    callTreeSearchString: query.search || '',
    categoryFilter: query.category || '',
    platformFilter: query.platform || '',
    runnableFilter: query.runnable || null,
    callTreeFilters: {
      [selectedThread]: query.callTreeFilters ? parseCallTreeFilters(query.callTreeFilters) : [],
    },
    invertCallstack: query.invertCallstack !== undefined,
    onlyUserInteracting: query.onlyUserInteracting !== undefined,
    hidePlatformDetails: query.hidePlatformDetails !== undefined,
  };
}
