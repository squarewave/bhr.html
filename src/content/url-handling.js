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
  query.implementation = urlState.implementation === 'combined'
    ? undefined
    : urlState.implementation;
  query.callTreeFilters = stringifyCallTreeFilters(urlState.callTreeFilters[urlState.selectedThread]) || undefined;
  const qString = queryString.stringify(query);
  return pathname + (qString ? '?' + qString : '');
}

export function stateFromCurrentLocation(): URLState {
  const pathname = window.location.pathname;
  const qString = window.location.search.substr(1);
  const hash = window.location.hash;
  const query = queryString.parse(qString);

  const selectedThread = query.thread !== undefined ? +query.thread : 0;

  let implementation = 'combined';
  if (query.implementation === 'js' || query.implementation === 'cpp') {
    implementation = query.implementation;
  } else if (query.jsOnly !== undefined) {
    // Support the old URL structure that had a jsOnly flag.
    implementation = 'js';
  }

  return {
    hash: '',
    selectedTab: 'calltree',
    rangeFilters: query.range ? parseRangeFilters(query.range) : [],
    selectedThread: selectedThread,
    callTreeSearchString: query.search || '',
    callTreeFilters: {
      [selectedThread]: query.callTreeFilters ? parseCallTreeFilters(query.callTreeFilters) : [],
    },
    implementation,
    invertCallstack: query.invertCallstack !== undefined,
    hidePlatformDetails: query.hidePlatformDetails !== undefined,
  };
}
