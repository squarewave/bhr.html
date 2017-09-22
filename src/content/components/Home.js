/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import actions from '../actions';

import type { ThunkAction } from '../actions/types';
import { getDurationSpec, getPayloadID } from '../reducers/url-state';

type Props = {
  retrieveProfileFromTelemetry: (string, string | null) => ThunkAction,
  payloadID: string | null,
};

class Home extends PureComponent {
  props: Props;

  constructor(props: Props) {
    super(props);
    (this: any)._profileRetriever = this._profileRetriever.bind(this);
  }

  _profileRetriever(durationSpec: string): () => void {
    return () => {
      const {
        retrieveProfileFromTelemetry,
        payloadID,
      } = this.props;
      retrieveProfileFromTelemetry(durationSpec, payloadID);
    };
  }

  render() {
    return (
      <div>
        <a onClick={this._profileRetriever('128_512')}>Hangs from 128-512ms</a>
        <a onClick={this._profileRetriever('512_2048')}>Hangs from 512-2048ms</a>
        <a onClick={this._profileRetriever('2048_65536')}>Hangs longer than 2048ms</a>
      </div>
    );
  }
}

Home.propTypes = {
  retrieveProfileFromTelemetry: PropTypes.func.isRequired,
  payloadID: PropTypes.string.isRequired,
};

export default connect(state => ({
  payloadID: getPayloadID(state),
}), actions)(Home);
