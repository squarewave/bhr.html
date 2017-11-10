/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import type { Action, ThunkAction } from '../actions/types';
import type { TrackedData } from '../../common/types/trackedData'
import actions from '../actions';
import { getTrackedData } from '../reducers/tracked-data-view'

type Props = {
  className: string,
  trackedData: TrackedData,
};

class TrackedDataViewer extends PureComponent {
  props: Props;

  render() {
    const {
      className,
      trackedData,
    } = this.props;

    return (
      <div className={className}>
        {trackedData.length}
      </div>
    );
  }
}

TrackedDataViewer.propTypes = {
  className: PropTypes.string.isRequired,
  trackedData: PropTypes.array.isRequired,
};

export default connect(state => ({
  className: 'trackedDataViewer',
  trackedData: getTrackedData(state),
}), actions)(TrackedDataViewer);
