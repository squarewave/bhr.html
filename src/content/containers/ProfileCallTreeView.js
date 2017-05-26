import React from 'react';
import ProfileTreeView from '../components/ProfileTreeView';
import ProfilePseudoStacksView from '../components/ProfilePseudoStacksView';
import ProfileCallTreeSettings from '../components/ProfileCallTreeSettings';
import ProfileCallTreeFilterNavigator from './ProfileCallTreeFilterNavigator';

const ProfileCallTreeView = () => (
  <div className='treeAndSidebarWrapper'>
    <ProfileCallTreeFilterNavigator />
    <ProfileCallTreeSettings />
    <div className='treeViewAndPseudoStacksWrapper'>
        <ProfileTreeView/>
        <ProfilePseudoStacksView/>
    </div>
  </div>
);

ProfileCallTreeView.propTypes = {
};

export default ProfileCallTreeView;
