// @flow
import profileView from './profile-view';
import trackedDataView from './tracked-data-view';
import app from './app';
import categoriesView from './categories-view';
import runnablesView from './runnables-view';
import dateGraph from './date-graph';
import urlState from './url-state';
import icons from './icons';

const reducer = { app, profileView, urlState, icons, categoriesView, runnablesView, dateGraph, trackedDataView };

export default reducer;
