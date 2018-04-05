import React from 'react';
import ProfileTreeView from '../components/ProfileTreeView';
import ProfileCallTreeSettings from '../components/ProfileCallTreeSettings';
import ProfileCallTreeFilterNavigator from './ProfileCallTreeFilterNavigator';

const ProfileCallTreeView = () => (
  <div className='treeAndSidebarWrapper'>
    <ProfileCallTreeSettings />
    <ProfileCallTreeFilterNavigator />
    <ProfileTreeView/>
  </div>
);

ProfileCallTreeView.propTypes = {
};

export default ProfileCallTreeView;
