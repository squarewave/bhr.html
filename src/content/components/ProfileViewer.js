/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import type { Action, ThunkAction } from '../actions/types';
import ProfileCallTreeView from '../containers/ProfileCallTreeView';
import ProfileTopBarActions from './ProfileTopBarActions';
import ProfileCategoriesView from './ProfileCategoriesView';
import ProfileRunnablesView from './ProfileRunnablesView';
import actions from '../actions';
import { getSelectedTab } from '../reducers/url-state';
import TabBar from './TabBar';
import ProfileCallTreeContextMenu from '../containers/ProfileCallTreeContextMenu';
import ProfileFilterNavigator from '../containers/ProfileFilterNavigator';
import ProfileViewerHeader from '../containers/ProfileViewerHeader';
import ProfileThreadHeaderContextMenu from '../containers/ProfileThreadHeaderContextMenu';

type Props = {
  className: string,
  changeSelectedTab: (string) => Action | ThunkAction,
  selectedTab: string,
};

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
        name: 'categories',
        title: 'Categories',
      },
      {
        name: 'runnables',
        title: 'Runnables',
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
          <ProfileTopBarActions />
        </div>
        <ProfileViewerHeader />
        <TabBar
          tabs={this._tabs}
          selectedTabName={selectedTab}
          onSelectTab={this._onSelectTab}
        />
        {
          {
            categories: <ProfileCategoriesView />,
            runnables: <ProfileRunnablesView />,
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
