import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import TreeView from './TreeView';
import NodeIcon from './NodeIcon';
import { getStackAsFuncArray } from '../profile-data';
import { getInvertCallstack, getSearchString, getSelectedThreadIndex } from '../reducers/url-state';
import {
  getProfile, selectedThreadSelectors, getScrollToSelectionGeneration, getProfileViewOptions,
} from '../reducers/profile-view';
import { getIconsWithClassNames } from '../reducers/icons';

import actions from '../actions';

class ProfileTreeView extends Component {
  constructor(props) {
    super(props);
    this._fixedColumns = [
      { propName: 'totalTimePercent', title: 'Time' },
      { propName: 'selfTime', title: 'Self time' },
      { propName: 'totalCountPercent', title: 'Count' },
    ];
    this._mainColumn = { propName: 'name', title: '' };
    this._appendageColumn = { propName: 'lib', title: '' };
    this._appendageButtons = ['focusCallstackButton'];
    this._onSelectedStackChange = this._onSelectedStackChange.bind(this);
    this._onExpandedStacksChange = this._onExpandedStacksChange.bind(this);
    this._onAppendageButtonClick = this._onAppendageButtonClick.bind(this);
  }

  componentDidMount() {
    this.focus();
    this.procureInterestingInitialSelection();
  }

  componentDidUpdate(prevProps) {
    if (this.props.scrollToSelectionGeneration > prevProps.scrollToSelectionGeneration) {
      if (this.refs.treeView) {
        this.refs.treeView.scrollSelectionIntoView();
      }
    }
  }

  focus() {
    this.refs.treeView.focus();
  }

  _onSelectedStackChange(newSelectedStack) {
    const { threadIndex, thread, changeSelectedStack } = this.props;
    changeSelectedStack(threadIndex,
      getStackAsFuncArray(newSelectedStack, thread.stackTable));
  }

  _onExpandedStacksChange(newExpandedStacks) {
    const { threadIndex, thread, changeExpandedStacks } = this.props;
    changeExpandedStacks(threadIndex,
      newExpandedStacks.map(stackIndex => getStackAsFuncArray(stackIndex, thread.stackTable)));
  }

  _onAppendageButtonClick(stackIndex) {
    const {
      thread, threadIndex, addCallTreeFilter,
      invertCallstack,
    } = this.props;
    if (invertCallstack) {
      addCallTreeFilter(threadIndex, {
        type: 'postfix',
        postfixFuncs: getStackAsFuncArray(stackIndex, thread.stackTable),
      });
    } else {
      addCallTreeFilter(threadIndex, {
        type: 'prefix',
        prefixFuncs: getStackAsFuncArray(stackIndex, thread.stackTable),
      });
    }
  }

  procureInterestingInitialSelection() {
    // Expand the heaviest callstack up to a certain depth and select the frame
    // at that depth.
    const { tree, expandedStacks } = this.props;
    const newExpandedStacks = expandedStacks.slice();
    const maxInterestingDepth = 17; // scientifically determined
    let currentStack = tree.getRoots()[0];
    newExpandedStacks.push(currentStack);
    for (let i = 0; i < maxInterestingDepth; i++) {
      const children = tree.getChildren(currentStack);
      if (children.length === 0) {
        break;
      }
      currentStack = children[0];
      newExpandedStacks.push(currentStack);
    }
    this._onExpandedStacksChange(newExpandedStacks);
    this._onSelectedStackChange(currentStack);
  }

  render() {
    const { tree, selectedStack, expandedStacks, searchString, disableOverscan } = this.props;
    return (
      <TreeView tree={tree}
                fixedColumns={this._fixedColumns}
                mainColumn={this._mainColumn}
                appendageColumn={this._appendageColumn}
                onSelectionChange={this._onSelectedStackChange}
                onExpandedNodesChange={this._onExpandedStacksChange}
                selectedNodeId={selectedStack}
                expandedNodeIds={expandedStacks}
                highlightString={searchString.toLowerCase()}
                disableOverscan={disableOverscan}
                appendageButtons={this._appendageButtons}
                onAppendageButtonClick={this._onAppendageButtonClick}
                ref='treeView'
                contextMenuId={'ProfileCallTreeContextMenu'}
                icons={this.props.icons} />
    );

  }
}

ProfileTreeView.propTypes = {
  thread: PropTypes.shape({
    dates: PropTypes.array.isRequired,
  }).isRequired,
  threadIndex: PropTypes.number.isRequired,
  scrollToSelectionGeneration: PropTypes.number.isRequired,
  tree: PropTypes.object.isRequired,
  selectedStack: PropTypes.number,
  expandedStacks: PropTypes.array.isRequired,
  changeSelectedStack: PropTypes.func.isRequired,
  changeExpandedStacks: PropTypes.func.isRequired,
  searchString: PropTypes.string,
  disableOverscan: PropTypes.bool,
  addCallTreeFilter: PropTypes.func.isRequired,
  invertCallstack: PropTypes.bool.isRequired,
  icons: PropTypes.array.isRequired,
};

export default connect(state => ({
  thread: selectedThreadSelectors.getFilteredThread(state),
  threadIndex: getSelectedThreadIndex(state),
  scrollToSelectionGeneration: getScrollToSelectionGeneration(state),
  tree: selectedThreadSelectors.getCallTree(state),
  selectedStack: selectedThreadSelectors.getSelectedStack(state),
  expandedStacks: selectedThreadSelectors.getExpandedStacks(state),
  searchString: getSearchString(state),
  disableOverscan: getProfileViewOptions(state).selection.isModifying,
  invertCallstack: getInvertCallstack(state),
  icons: getIconsWithClassNames(state),
}), actions, null, { withRef: true })(ProfileTreeView);
