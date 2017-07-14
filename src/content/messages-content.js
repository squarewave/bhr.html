/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { profileCategoriesProcessed } from './actions/categories-view';
import { profileRunnablesProcessed } from './actions/runnables-view';
import { dateGraphRebuilt } from './actions/date-graph';
/**
 * Messages are the translation layer from actions dispatched by the worker
 * thread to the content thread. This de-couples the state of the two threads.
 */
const messages = {};
export default messages;

messages.PROFILE_CATEGORIES_PROCESSED = function(message, call) {
  call(profileCategoriesProcessed, message.categories);
};

messages.PROFILE_RUNNABLES_PROCESSED = function(message, call) {
  call(profileRunnablesProcessed, message.runnables);
};

messages.DATE_GRAPH_REBUILT = function(message, call) {
  call(dateGraphRebuilt, message.dateGraph);
};
