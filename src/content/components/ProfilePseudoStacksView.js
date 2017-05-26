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

class PseudoStackRow extends Component {
  _getPseudoStackString() {
    const {
      pseudoStack,
      thread: {
        stringTable,
        funcTable,
        pseudoStackTable,
      },
    } = this.props;

    let stack = '';
    let stackIndex = pseudoStack;

    while (pseudoStackTable.prefix[stackIndex] !== -1) {
      const funcIndex = pseudoStackTable.func[stackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack = stringTable.getString(stringIndex) + '\n' + stack;
      stackIndex = pseudoStackTable.prefix[stackIndex];
    }

    return stack;
  }

  render() {
    const {
      maxHangMs,
      hangMs,
      index,
    } = this.props;

    const evenOddClassName = (index % 2) === 0 ? 'even' : 'odd';
    return (
      <div className={`pseudoStackRow ${evenOddClassName}`}>
        <div className="pseudoStackMsBar" style={{width: `${(hangMs / maxHangMs * 100).toFixed(0)}%`}} />
        <pre>{this._getPseudoStackString()}</pre>
      </div>
    );
  }
}

PseudoStackRow.propTypes = {
  thread: PropTypes.object.isRequired,
  pseudoStack: PropTypes.number.isRequired,
  hangMs: PropTypes.number.isRequired,
  maxHangMs: PropTypes.number.isRequired,
};

class ProfilePseudoStacksView extends Component {
  render() {
    const {
      selectedStack,
      tree,
      thread,
    } = this.props;

    const {
      stringTable,
      funcTable,
      stackTable,
      stackToPseudoStacksTable,
      stackToPseudoStacksIndex,
      pseudoStackTable,
    } = thread;

    const descendants = tree.getDescendants(selectedStack);
    descendants.push(selectedStack);

    const indices = stackToPseudoStacksIndex.getRowIndices(descendants);
    const weights = new Float32Array(pseudoStackTable.length);
    for (let index of indices) {
      weights[stackToPseudoStacksTable.pseudo_stack[index]] += stackToPseudoStacksTable.stackHangMs[index];
    }
    const pseudoStacks = Array.from(weights.map((w,i) => i));
    pseudoStacks.sort((lhs, rhs) => weights[rhs] - weights[lhs]);
    console.log(pseudoStacks.map(i => weights[i]).slice(0,5));
    const maxHangMs = weights[pseudoStacks[0]];

    return (
      <div className="pseudoStacksView">
        <div className="pseudoStacksViewHeader">Pseudo Stacks</div>
        {pseudoStacks.slice(0, 20).map((pseudoStack, index) =>
            <PseudoStackRow key={pseudoStack}
              pseudoStack={pseudoStack}
              thread={thread}
              hangMs={weights[pseudoStack]}
              maxHangMs={maxHangMs}
              index={index} />)}
      </div>
    );
  }
}

ProfilePseudoStacksView.propTypes = {
  thread: PropTypes.object.isRequired,
  threadIndex: PropTypes.number.isRequired,
  tree: PropTypes.object.isRequired,
  selectedStack: PropTypes.number,
};

export default connect(state => ({
  thread: selectedThreadSelectors.getFilteredThread(state),
  threadIndex: getSelectedThreadIndex(state),
  tree: selectedThreadSelectors.getCallTree(state),
  selectedStack: selectedThreadSelectors.getSelectedStack(state),
}), actions, null, { withRef: true })(ProfilePseudoStacksView);
