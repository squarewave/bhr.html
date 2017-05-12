import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import ThreadStackGraph from './ThreadStackGraph';
import { selectorsForThread } from '../reducers/profile-view';
import { getSelectedThreadIndex } from '../reducers/url-state';
import { getSampleIndexClosestToTime, getStackAsFuncArray } from '../profile-data';
import actions from '../actions';
import { ContextMenuTrigger } from 'react-contextmenu';

class ProfileThreadHeaderBar extends Component {

  constructor(props) {
    super(props);
    this._onLabelMouseDown = this._onLabelMouseDown.bind(this);
    this._onGraphClick = this._onGraphClick.bind(this);
    this._onMarkerSelect = this._onMarkerSelect.bind(this);
  }

  _onLabelMouseDown(e) {
    const { changeSelectedThread, threadIndex } = this.props;
    changeSelectedThread(threadIndex);

    // Don't allow clicks on the threads list to steal focus from the tree view.
    e.preventDefault();
  }

  _onGraphClick(time) {
    const { threadIndex, changeSelectedThread } = this.props;
    changeSelectedThread(threadIndex);
    // TODO
    // if (time !== undefined) {
    //   const { thread, changeSelectedFuncStack } = this.props;
    //   const sampleIndex = getSampleIndexClosestToTime(thread.samples, time);
    //   const newSelectedStack = thread.samples.stack[sampleIndex];
    //   const newSelectedFuncStack = newSelectedStack === null ? -1 : funcStackInfo.stackIndexToFuncStackIndex[newSelectedStack];
    //   changeSelectedFuncStack(threadIndex,
    //     getStackAsFuncArray(newSelectedFuncStack, funcStackInfo.funcStackTable));
    // }
  }

  _onMarkerSelect(/* markerIndex */) {
  }

  render() {
    const {
      thread, rangeStart, rangeEnd, selectedStack,
      isSelected, style, threadName,
    } = this.props;

    return (
      <li className={'profileThreadHeaderBar' + (isSelected ? ' selected' : '')} style={style}>
        <ContextMenuTrigger id={'ProfileThreadHeaderContextMenu'}
                            renderTag='h1'
                            title={threadName}
                            onMouseDown={this._onLabelMouseDown}
                            attributes={{ className: 'grippy' }}>
          {threadName}
        </ContextMenuTrigger>
        <ThreadStackGraph thread={thread}
                          className='threadStackGraph'
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          selectedStack={selectedStack}
                          onClick={this._onGraphClick}
                          onMarkerSelect={this._onMarkerSelect}/>
      </li>
    );
  }

}

ProfileThreadHeaderBar.propTypes = {
  threadIndex: PropTypes.number.isRequired,
  thread: PropTypes.object.isRequired,
  changeSelectedThread: PropTypes.func.isRequired,
  changeSelectedStack: PropTypes.func.isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  selectedStack: PropTypes.number.isRequired,
  isSelected: PropTypes.bool.isRequired,
  style: PropTypes.object,
  threadName: PropTypes.string,
};

export default connect((state, props) => {
  const threadIndex = props.index;
  const selectors = selectorsForThread(threadIndex);
  const selectedThread = getSelectedThreadIndex(state);
  return {
    thread: selectors.getFilteredThread(state),
    threadName: selectors.getFriendlyThreadName(state),
    selectedStack: threadIndex === selectedThread ? selectors.getSelectedStack(state) : -1,
    isSelected: threadIndex === selectedThread,
    threadIndex,
  };
}, actions)(ProfileThreadHeaderBar);
