/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import { getDurationSpec } from '../reducers/url-state';
import actions from '../actions';
import ArrowPanel from './ArrowPanel';
import ButtonWithPanel from './ButtonWithPanel';

require('./ProfileSelectDurationSpec.css');

const ProfileSelectDurationSpec = ({
  durationSpec
}) => {

  function friendlyDurationSpec(s) {
    switch (s) {
      case '128_512':
        return '128ms-512ms Hangs';
      case '512_2048':
        return '512ms-2048ms Hangs';
      case '2048_65536':
        return 'Hangs longer than 2048ms';
    }
  }

  return (
    <div className="profileDurationSpec">
      <ButtonWithPanel
        className="profileDurationSpecButton"
        label={'Viewing ' + friendlyDurationSpec(durationSpec)}
        panel={
          <ArrowPanel
            className="profileDurationSpecPanel"
            title="View Other Hangs"
          >
            <section>
              {['128_512', '512_2048', '2048_65536'].map(s => (
                s != durationSpec && <p key={s}>
                  <a
                    className="profileDurationSpecLink"
                    href={`/?durationSpec=${s}`}
                  >
                    {friendlyDurationSpec(s)}
                  </a>
                </p>
              ))}
            </section>
          </ArrowPanel>
        }
      />
    </div>
  );
}

ProfileSelectDurationSpec.propTypes = {
};

export default connect(
  state => ({
    durationSpec: getDurationSpec(state),
  }),
  actions
)(ProfileSelectDurationSpec);
