import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import ProfileCallTreeView from '../containers/ProfileCallTreeView';
import actions from '../actions';
import ProfileCallTreeContextMenu from '../containers/ProfileCallTreeContextMenu';

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
        <ProfileCallTreeView />
        <ProfileCallTreeContextMenu />
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
