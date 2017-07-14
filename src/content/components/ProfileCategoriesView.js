/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import { getProfile } from '../reducers/profile-view';
import {
  getProfileCategories,
} from '../reducers/categories-view';
import SummarizeLineGraph from './SummarizeLineGraph';
import SummarizeProfileHeader from './SummarizeProfileCategoriesHeader';
import SummarizeProfileExpand from './SummarizeProfileExpand';
import SummarizeProfileThread from './SummarizeProfileThread';
import actions from '../actions';

require('./ProfileSummaryView.css');

const EXPAND_LENGTH = 20;

class ProfileCategoriesView extends PureComponent {
  constructor() {
    super();
    this._onCategorySelected = this._onCategorySelected.bind(this);
  }

  _onCategorySelected(threadIndex) {
    return (category) => {
      const { changeCategoryFilter, changeSelectedThread, changeSelectedTab } = this.props;
      changeSelectedThread(threadIndex);
      changeCategoryFilter(category);
      changeSelectedTab('calltree');
    };
  }

  render() {
    const {
      categories,
      threads,
    } = this.props;

    if (categories) {
      return (
        <div className="summarize-profile">
          <div className="summarize-profile-inner">
            {categories.map(({ threadIndex, summary, rollingSummary }) => {
              const { processType, name: threadName } = threads[threadIndex];

              return (
                <div key={threadIndex}>
                  <div className="summarize-profile-table">
                    <SummarizeProfileHeader
                      threadName={threadName}
                      processType={processType}
                    />
                    {summary.map((summaryTable, index) =>
                      <SummarizeProfileThread
                        row={{ name: summaryTable.category, percentage: summaryTable.percentage }}
                        rollingSummary={rollingSummary}
                        index={index}
                        onSelected={this._onCategorySelected(threadIndex)}
                        key={summaryTable.category}
                      />
                    )}
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

ProfileCategoriesView.propTypes = {
  categories: PropTypes.array,
  threads: PropTypes.array,
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
    categories: getProfileCategories(state),
    threads: getProfile(state).threads,
  };
}, actions)(ProfileCategoriesView);
