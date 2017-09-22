import React, { PureComponent, PropTypes } from 'react';
import ProfileThreadHeaderBar from '../components/ProfileThreadHeaderBar';
import Reorderable from '../components/Reorderable';
import ThreadStackGraph from '../components/ThreadStackGraph';
import TimeSelectionScrubber from '../components/TimeSelectionScrubber';
import OverflowEdgeIndicator from '../components/OverflowEdgeIndicator';
import { connect } from 'react-redux';
import { getProfile, getProfileViewOptions, getThreadOrder, getDisplayRange, getZeroAt, selectorsForThread } from '../reducers/profile-view';
import { getSelectedThreadIndex } from '../reducers/url-state';
import actions from '../actions';

class ProfileViewerHeader extends PureComponent {

  constructor(props) {
    super(props);
    this._onZoomButtonClick = this._onZoomButtonClick.bind(this);
    this._onIntervalMarkerSelect = this._onIntervalMarkerSelect.bind(this);
  }

  _onZoomButtonClick(start, end) {
    const { addRangeFilterAndUnsetSelection, zeroAt } = this.props;
    addRangeFilterAndUnsetSelection(Math.ceil(start - zeroAt), Math.floor(end - zeroAt));
  }

  _onIntervalMarkerSelect(threadIndex, start, end) {
    const { timeRange, updateProfileSelection, changeSelectedThread } = this.props;
    updateProfileSelection({
      hasSelection: true,
      isModifying: false,
      selectionStart: Math.max(timeRange.start, start),
      selectionEnd: Math.min(timeRange.end, end),
    });
    changeSelectedThread(threadIndex);
  }

  render() {
    const {
      profile, className, threadOrder, changeThreadOrder, selection,
      updateProfileSelection, timeRange, zeroAt, selectedThread,
      selectedStack,
    } = this.props;
    const { threads, dates } = profile;
    const { hasSelection, isModifying, selectionStart, selectionEnd } = selection;

    return <TimeSelectionScrubber className={`${className}Header`}
                           dates={dates}
                           zeroAt={zeroAt}
                           rangeStart={timeRange.start}
                           rangeEnd={timeRange.end}
                           hasSelection={hasSelection}
                           isModifying={isModifying}
                           selectionStart={selectionStart}
                           selectionEnd={selectionEnd}
                           onSelectionChange={updateProfileSelection}
                           onZoomButtonClick={this._onZoomButtonClick}>
      <div>
        {<Reorderable tagName='ol'
                     className={`${className}HeaderThreadList`}
                     order={threadOrder}
                     orient='vertical'
                     onChangeOrder={changeThreadOrder}>
          {
            threads.map((thread, threadIndex) =>
              <ProfileThreadHeaderBar key={threadIndex}
                                      index={threadIndex}
                                      rangeStart={timeRange.start}
                                      rangeEnd={timeRange.end}/>
            )
          }
        </Reorderable>}
      </div>
      <ThreadStackGraph thread={selectedThread}
                        className='threadStackGraph'
                        dates={dates}
                        rangeStart={timeRange.start}
                        rangeEnd={timeRange.end}
                        selectedStack={selectedStack}/>
    </TimeSelectionScrubber>;
  }
}

ProfileViewerHeader.propTypes = {
  profile: PropTypes.object.isRequired,
  className: PropTypes.string.isRequired,
  threadOrder: PropTypes.array.isRequired,
  changeThreadOrder: PropTypes.func.isRequired,
  selection: PropTypes.object.isRequired,
  updateProfileSelection: PropTypes.func.isRequired,
  addRangeFilterAndUnsetSelection: PropTypes.func.isRequired,
  timeRange: PropTypes.object.isRequired,
  zeroAt: PropTypes.number.isRequired,
  changeSelectedThread: PropTypes.func.isRequired,
};

export default connect(state => {
  const threadIndex = getSelectedThreadIndex(state);
  const selectors = selectorsForThread(threadIndex);
  return {
    selectedThread: selectors.getFilteredThread(state),
    selectedStack: selectors.getSelectedStack(state),
    profile: getProfile(state),
    selection: getProfileViewOptions(state).selection,
    className: 'profileViewer',
    threadOrder: getThreadOrder(state),
    timeRange: getDisplayRange(state),
    zeroAt: getZeroAt(state),
  };
}, actions)(ProfileViewerHeader);
