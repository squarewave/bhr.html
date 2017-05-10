import React, { Component, PropTypes } from 'react';
import { connect, Provider } from 'react-redux';
import actions from '../actions';
import ProfileViewer from '../components/ProfileViewer';
import { urlFromState, stateFromCurrentLocation } from '../url-handling';
import { getView } from '../reducers/app';
import { getHash } from '../reducers/url-state';
import URLManager from './URLManager';

class ProfileViewWhenReadyImpl extends Component {
  componentDidMount() {
    const {
      retrieveProfileFromTelemetry
    } = this.props;
    retrieveProfileFromTelemetry();
  }

  render() {

    const { view } = this.props;
    switch (view) {
      case 'INITIALIZING':
        return <div>Retrieving data from telemetry...</div>;
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
  retrieveProfileFromTelemetry: PropTypes.func.isRequired,
};

const ProfileViewWhenReady = connect(state => ({
  view: getView(state),
  hash: getHash(state),
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
