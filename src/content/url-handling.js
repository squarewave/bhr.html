// @flow
import queryString from 'query-string';
import { stringifyRangeFilters, parseRangeFilters } from './range-filters';
import { stringifyTransforms, parseTransforms } from './transforms';
import type { URLState, ExploreURLState, TrackURLState, UnknownURLState } from './reducers/types';

export function urlFromState(urlState: any) {
  const pathname = '/';

  // Start with the query parameters that are shown regardless of the active tab.
  let query: Object = {};

  query.mode = urlState.mode;
  if (urlState.mode == 'explore') {
    query.range = stringifyRangeFilters(urlState.rangeFilters) || undefined,
    query.transforms = stringifyTransforms(urlState.transforms[urlState.selectedThread]) || undefined,
    query.thread = `${urlState.selectedThread}`,
    query.search = urlState.callTreeSearchString || undefined;
    query.invertCallstack = urlState.invertCallstack ? null : undefined;
    query.category = urlState.categoryFilter || undefined;
    query.platform = urlState.platformFilter || undefined;
    query.runnable = urlState.runnableFilter || undefined;
    query.durationSpec = urlState.durationSpec || undefined;
    query.onlyUserInteracting = urlState.onlyUserInteracting || undefined;
    query.payloadID = urlState.payloadID || undefined;
    query.historical = urlState.historical || undefined;
  } else if (urlState.mode == 'track') {
    query.trackedStat = urlState.trackedStat || undefined;
  }
  const qString = queryString.stringify(query);
  return pathname + (qString ? '?' + qString : '');
}

export function stateFromCurrentLocation(): URLState {
  const pathname = window.location.pathname;
  const qString = window.location.search.substr(1);
  const hash = window.location.hash;
  const query = queryString.parse(qString);

  let mode = query.mode;
  if (!mode) {
    if (query.durationSpec) {
      mode = 'explore';
    } else {
      mode = 'none';
    }
  }

  if (mode == 'explore') {
    const selectedThread = query.thread !== undefined ? +query.thread : 0;
    return ({
      selectedTab: 'calltree',
      durationSpec: query.durationSpec || '2048_65536',
      payloadID: query.payloadID,
      historical: query.historical == "true",
      rangeFilters: query.range ? parseRangeFilters(query.range) : [],
      selectedThread: selectedThread,
      callTreeSearchString: query.search || '',
      categoryFilter: query.category || 'all',
      platformFilter: query.platform || '',
      runnableFilter: query.runnable || null,
      invertCallstack: query.invertCallstack !== undefined,
      onlyUserInteracting: query.onlyUserInteracting !== undefined,
      hidePlatformDetails: query.hidePlatformDetails !== undefined,
      transforms: {
        [selectedThread]: query.transforms ? parseTransforms(query.transforms) : [],
      },
      mode,
    } : ExploreURLState);
  } else if (mode == 'track') {
    return ({
      trackedStat: query.trackedStat || 'All Hangs',
      mode,
    } : TrackURLState);
  } else {
    return ({ mode } : UnknownURLState);
  }

}
