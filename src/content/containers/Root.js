import React, { Component, PropTypes } from 'react';
import { connect, Provider } from 'react-redux';
import actions from '../actions';
import Home from '../components/Home';
import ProfileViewer from '../components/ProfileViewer';
import TrackedDataViewer from '../components/TrackedDataViewer';
import { urlFromState, stateFromCurrentLocation } from '../url-handling';
import { getView, getError } from '../reducers/app';
import { getDurationSpec, getPayloadID, getHistorical, getMode } from '../reducers/url-state';
import URLManager from './URLManager';

require('./Root.css');

class ProfileViewWhenReadyImpl extends Component {
  _errorView(error) {
    return <div className="root">Received error: {error}</div>;
  }

  _initializingView() {
    return <div className="root">Waiting for profile from telemetry</div>;
  }

  _notFoundView() {
    return <div className="root">View not found.</div>;
  }

  render() {
    const {
      mode,
      view,
      error,
      durationSpec,
      payloadID, 
      historical,
      retrieveProfileFromTelemetry,
      retrieveTrackedDataFromTelemetry,
    } = this.props;

    if (mode == 'none') {
      return <Home />;
    } else if (mode == 'explore') {
      switch (view) {
        case 'INITIALIZING':
          retrieveProfileFromTelemetry(durationSpec, payloadID, historical);
          return this._initializingView();
        case 'ERROR':
          return this._errorView();
        case 'PROFILE':
          return <ProfileViewer/>;
        default:
          return this._notFoundView();
      }
    } else if (mode == 'track') {
      switch (view) {
        case 'INITIALIZING':
          retrieveTrackedDataFromTelemetry();
          return this._initializingView();
        case 'ERROR':
          return this._errorView();
        case 'PROFILE':
          return <TrackedDataViewer/>;
        default:
          return this._notFoundView();
      }
    } else {
      return this._notFoundView();
    }
  }
}

ProfileViewWhenReadyImpl.propTypes = {
  mode: PropTypes.string.isRequired,
  view: PropTypes.string.isRequired,
  error: PropTypes.string,
  durationSpec: PropTypes.string.isRequired,
  payloadID: PropTypes.string,
  historical: PropTypes.bool,
  retrieveProfileFromTelemetry: PropTypes.func.isRequired,
};

const ProfileViewWhenReady = connect(state => ({
  mode: getMode(state),
  view: getView(state),
  error: getError(state),
  durationSpec: getDurationSpec(state),
  payloadID: getPayloadID(state),
  historical: getHistorical(state),
}), actions)(ProfileViewWhenReadyImpl);

export default class Root extends Component {
  render() {
    const { store } = this.props;
    return (
      <Provider store={store}>
        <URLManager urlFromState={urlFromState} stateFromCurrentLocation={stateFromCurrentLocation}>
          <ProfileViewWhenReady/>
        </URLManager>
      </Provider>
    );
  }
}

Root.propTypes = {
  store: PropTypes.any.isRequired,
};
