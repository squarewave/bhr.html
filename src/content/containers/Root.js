import React, { Component, PropTypes } from 'react';
import { connect, Provider } from 'react-redux';
import actions from '../actions';
import Home from '../components/Home';
import ProfileViewer from '../components/ProfileViewer';
import { urlFromState, stateFromCurrentLocation } from '../url-handling';
import { getView } from '../reducers/app';
import { getHash, getDurationSpec } from '../reducers/url-state';
import URLManager from './URLManager';

class ProfileViewWhenReadyImpl extends Component {
  render() {
    const { view, durationSpec, retrieveProfileFromTelemetry } = this.props;
    switch (view) {
      case 'INITIALIZING':
        console.log(durationSpec);
        retrieveProfileFromTelemetry(durationSpec);
        return <div>Waiting for profile from telemetry...</div>
      case 'PROFILE':
        return <ProfileViewer/>;
      default:
        return <div>View not found.</div>;
    }
  }
}

ProfileViewWhenReadyImpl.propTypes = {
  view: PropTypes.string.isRequired,
  hash: PropTypes.string,
  durationSpec: PropTypes.string.isRequired,
  retrieveProfileFromTelemetry: PropTypes.func.isRequired,
};

const ProfileViewWhenReady = connect(state => ({
  view: getView(state),
  hash: getHash(state),
  durationSpec: getDurationSpec(state),
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
