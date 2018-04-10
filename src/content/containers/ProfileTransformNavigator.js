import { connect } from 'react-redux';
import actions from '../actions';
import { selectedThreadSelectors } from '../reducers/profile-view';
import { getSelectedThreadIndex } from '../reducers/url-state';
import FilterNavigatorBar from '../components/FilterNavigatorBar';

import './ProfileTransformNavigator.css';

export default connect(state => {
  const items = selectedThreadSelectors.getTransformLabels(state);
  return {
    className: 'profileTransformNavigator',
    items,
    selectedItem: items.length - 1,
    threadIndex: getSelectedThreadIndex(state),
  };
}, actions, (stateProps, dispatchProps) => ({
  className: stateProps.className,
  items: stateProps.items,
  selectedItem: stateProps.selectedItem,
  onPop: dispatchProps.popTransformsFromStack,
}))(FilterNavigatorBar);
