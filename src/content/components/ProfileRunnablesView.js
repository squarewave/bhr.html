/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import { getProfile } from '../reducers/profile-view';
import {
  getProfileRunnables,
  getProfileExpandedRunnables,
} from '../reducers/runnables-view';
import SummarizeLineGraph from './SummarizeLineGraph';
import SummarizeProfileHeader from './SummarizeProfileRunnablesHeader';
import SummarizeProfileExpand from './SummarizeProfileExpand';
import SummarizeProfileThread from './SummarizeProfileThread';
import actions from '../actions';

require('./ProfileSummaryView.css');

const EXPAND_LENGTH = 5;

class ProfileRunnablesView extends PureComponent {
  constructor() {
    super();
    this._onRunnableSelected = this._onRunnableSelected.bind(this);
  }

  _onRunnableSelected(threadIndex) {
    return (category) => {
      const { changeRunnableFilter, changeSelectedThread, changeSelectedTab } = this.props;
      changeSelectedThread(threadIndex);
      changeRunnableFilter(category);
      changeSelectedTab('calltree');
    };
  }

  render() {
    const {
      summaries,
      expanded,
      threads,
      collapseRunnablesThread: collapse,
      expandRunnablesThread: expand,
    } = this.props;

    if (summaries) {
      return (
        <div className="summarize-profile">
          <div className="summarize-profile-inner">
            {summaries.map(({ threadIndex, summary, rollingSummary }) => {
              const { processType, name: threadName } = threads[threadIndex];
              const isExpanded = expanded.has(threadIndex);
              const sliced = summary.slice(0, isExpanded ? summary.length : EXPAND_LENGTH);

              return (
                <div key={threadIndex}>
                  <div className="summarize-profile-table">
                    <SummarizeProfileHeader
                      threadName={threadName}
                      processType={processType}
                    />
                    {sliced.map((row, index) =>
                      <SummarizeProfileThread
                        row={{ name: row.runnable, percentage: row.percentage }}
                        rollingSummary={rollingSummary}
                        isExpanded={isExpanded}
                        index={index}
                        onSelected={this._onRunnableSelected(threadIndex)}
                        key={row.runnable}
                      />
                    )}

                    <SummarizeProfileExpand
                      summary={summary}
                      threadIndex={threadIndex}
                      isExpanded={isExpanded}
                      expand={expand}
                      collapse={collapse}
                      expandLength={EXPAND_LENGTH}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="summarize-profile">
        <div className="summarize-profile-inner">
          {threads.map((thread, threadIndex) =>
            <div key={threadIndex}>
              <div className="summarize-profile-table">
                <SummarizeProfileHeader
                  threadName={thread.name}
                  processType={thread.processType}
                />
                {fill(3, i =>
                  <div className="summarize-profile-row" key={i}>
                    <SummarizeLineGraph />
                    <div className="summarize-profile-details">
                      <div className="summarize-profile-text">
                        <div className="filler summarize-profile-filler" />
                      </div>
                      <div className="summarize-profile-numeric">
                        <div className="filler summarize-profile-filler" />
                      </div>
                      <div className="summarize-profile-numeric">
                        <div className="filler summarize-profile-filler" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

ProfileRunnablesView.propTypes = {
  summaries: PropTypes.array,
  expanded: PropTypes.object,
  threads: PropTypes.array,
  collapseRunnablesThread: PropTypes.func,
  expandRunnablesThread: PropTypes.func,
};

function fill(size, fn) {
  const array = Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = fn(i);
  }
  return array;
}

export default connect(state => {
  return {
    expanded: getProfileExpandedRunnables(state),
    summaries: getProfileRunnables(state),
    threads: getProfile(state).threads,
  };
}, actions)(ProfileRunnablesView);
