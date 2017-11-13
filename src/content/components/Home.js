/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import actions from '../actions';

import type { ThunkAction } from '../actions/types';
import { getDurationSpec, getPayloadID } from '../reducers/url-state';

require('./Home.css');

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

  _profileRetriever(durationSpec: string, historical: boolean): () => void {
    return () => {
      const {
        retrieveProfileFromTelemetry,
        payloadID,
      } = this.props;
      retrieveProfileFromTelemetry(durationSpec, payloadID);
    };
  }

  _homeButton(url, text) {
    return (
      <a href={url} className="homeButton">
        {text}
      </a>
    );
  }

  render() {
    return (
      <div className="home">
        <section className="homeSection">
          <h1 className="homeTitle">
            <span className="homeTitleText">AreWeSmoothYet</span>
            <span className="homeTitleSubtext">
              {' '}&mdash; Firefox Nightly hang telemetry visualization
            </span>
            <a
              className="homeTitleGithubIcon"
              href="https://github.com/squarewave/bhr.html"
            >
              <svg
                width="22"
                height="22"
                className="octicon octicon-mark-github"
                viewBox="0 0 16 16"
                version="1.1"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
            </a>
          </h1>
          <div className="homeOptions">
            <div className="homeOptionsLeft">
              <div className="homeOptionsSubdivision">
                <div className="homeOptionsButtonRowHeader">Light hangs (128-512ms)</div>
                <div className="homeOptionsButtonRow">
                  {this._homeButton("/?mode=explore&durationSpec=128_512&historical=false", "Past 9 days")}
                </div>
              </div>
              <div className="homeOptionsSubdivision">
                <div className="homeOptionsButtonRowHeader">Medium hangs (512-2048ms)</div>
                <div className="homeOptionsButtonRow">
                  {this._homeButton("/?mode=explore&durationSpec=512_2048&historical=false", "Past 9 days")}
                  {this._homeButton("/?mode=explore&durationSpec=512_2048&historical=true", "Since Sept. 1st (Experimental)")}
                </div>
              </div>
              <div className="homeOptionsSubdivision">
                <div className="homeOptionsButtonRowHeader">Severe hangs (2048ms+)</div>
                <div className="homeOptionsButtonRow">
                  {this._homeButton("/?mode=explore&durationSpec=2048_65536&historical=false", "Past 9 days")}
                  {this._homeButton("/?mode=explore&durationSpec=2048_65536&historical=true", "Since Sept. 1st (Experimental)")}
                </div>
              </div>
            </div>
            <div className="homeOptionsRight">
              <div className="homeOptionsSubdivision">
                <div className="homeOptionsButtonRowHeader">Tracked hangs</div>
                <div className="homeOptionsButtonRow">
                  {this._homeButton("/?mode=track&trackedStat=" + encodeURIComponent("All Hangs"), "All Hangs")}
                </div>
                <div className="homeOptionsButtonRow">
                  {this._homeButton("/?mode=track&trackedStat=" + encodeURIComponent("Devtools Hangs"), "Devtools hangs")}
                </div>
                <div className="homeOptionsButtonRow">
                  <a href="https://github.com/squarewave/bhr.html/issues/new?title=Add%20Tracking%20for%20[What%20you%20want%20to%20track]&body=[Explain%20the%20details%20of%20what%20you%20need%20tracked,%20like%20%22stacks%20containing%20foobar%22]">
                    Track something new
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

Home.propTypes = {
  retrieveProfileFromTelemetry: PropTypes.func.isRequired,
  payloadID: PropTypes.string,
};

export default connect(state => ({
  payloadID: getPayloadID(state),
}), actions)(Home);
