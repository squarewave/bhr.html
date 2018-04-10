import React from 'react';
import ProfileTreeView from '../components/ProfileTreeView';
import ProfileCallTreeSettings from '../components/ProfileCallTreeSettings';
import ProfileTransformNavigator from './ProfileTransformNavigator';

const ProfileCallTreeView = () => (
  <div className='treeAndSidebarWrapper'>
    <ProfileCallTreeSettings />
    <ProfileTransformNavigator />
    <ProfileTreeView/>
  </div>
);

ProfileCallTreeView.propTypes = {
};

export default ProfileCallTreeView;
