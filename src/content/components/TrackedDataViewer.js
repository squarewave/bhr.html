/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import type { Action, ThunkAction } from '../actions/types';
import actions from '../actions';

type Props = {
  className: string,
};

class TrackedDataViewer extends PureComponent {
  props: Props;

  constructor(props) {
    super(props);
  }

  render() {
    const {
      className,
    } = this.props;
    return (
      <div className={className}>
      </div>
    );
  }
}

TrackedDataViewer.propTypes = {
  className: PropTypes.string.isRequired,
};

export default connect(state => ({
  className: 'trackedDataViewer',
}), actions)(TrackedDataViewer);
