import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import ProfileCallTreeView from '../containers/ProfileCallTreeView';
import actions from '../actions';
import ProfileCallTreeContextMenu from '../containers/ProfileCallTreeContextMenu';
import ProfileFilterNavigator from '../containers/ProfileFilterNavigator';
import ProfileViewerHeader from '../containers/ProfileViewerHeader';
import ProfileThreadHeaderContextMenu from '../containers/ProfileThreadHeaderContextMenu';

class ProfileViewer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      className
    } = this.props;
    return (
      <div className={className}>
        <div className={`${className}TopBar`}>
          <ProfileFilterNavigator />
        </div>
        <ProfileViewerHeader />
        <ProfileCallTreeView />

        <ProfileCallTreeContextMenu />
        <ProfileThreadHeaderContextMenu />
      </div>
    );
  }
}

ProfileViewer.propTypes = {
  className: PropTypes.string.isRequired,
};

export default connect(state => ({
  className: 'profileViewer',
}), actions)(ProfileViewer);
