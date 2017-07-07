/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import ProfileCallTreeView from '../containers/ProfileCallTreeView';
import ProfileSummaryView from './ProfileSummaryView';
import actions from '../actions';
import { getSelectedTab } from '../reducers/url-state';
import TabBar from './TabBar';
import ProfileCallTreeContextMenu from '../containers/ProfileCallTreeContextMenu';
import ProfileFilterNavigator from '../containers/ProfileFilterNavigator';
import ProfileViewerHeader from '../containers/ProfileViewerHeader';
import ProfileThreadHeaderContextMenu from '../containers/ProfileThreadHeaderContextMenu';

class ProfileViewer extends PureComponent {
  props: Props;
  state: {
    isMounted: boolean,
  };
  _tabs: { name: string, title: string }[];

  constructor(props) {
    super(props);
    (this: any)._onSelectTab = this._onSelectTab.bind(this);
    this.state = { isMounted: false };
    // If updating this list, make sure and update the tabOrder reducer with another index.
    this._tabs = [
      {
        name: 'summary',
        title: 'Categories',
      },
      {
        name: 'calltree',
        title: 'Call Tree',
      },
    ];
  }

  _onSelectTab(selectedTab: string) {
    const { changeSelectedTab } = this.props;
    changeSelectedTab(selectedTab);
  }

  render() {
    const {
      className,
      selectedTab,
    } = this.props;
    return (
      <div className={className}>
        <div className={`${className}TopBar`}>
          <ProfileFilterNavigator />
        </div>
        <ProfileViewerHeader />
        <TabBar
          tabs={this._tabs}
          selectedTabName={selectedTab}
          onSelectTab={this._onSelectTab}
        />
        {
          {
            summary: <ProfileSummaryView />,
            calltree: <ProfileCallTreeView />,
          }[selectedTab]
        }

        <ProfileCallTreeContextMenu />
        <ProfileThreadHeaderContextMenu />
      </div>
    );
  }
}

ProfileViewer.propTypes = {
  className: PropTypes.string.isRequired,
  changeSelectedTab: PropTypes.func.isRequired,
};

export default connect(state => ({
  selectedTab: getSelectedTab(state),
  className: 'profileViewer',
}), actions)(ProfileViewer);
