// @flow
import React, { PureComponent } from 'react';
import { ContextMenu, MenuItem, SubMenu } from 'react-contextmenu';
import actions from '../actions';
import { connect } from 'react-redux';
import { selectedThreadSelectors } from '../reducers/profile-view';
import copy from 'copy-to-clipboard';

import type { Thread, IndexIntoStackTable } from '../../common/types/profile';

type Props = {
  thread: Thread,
  selectedStack: IndexIntoStackTable,
};

class ProfileCallTreeContextMenu extends PureComponent {

  constructor(props: Props) {
    super(props);
    (this: any).handleClick = this.handleClick.bind(this);
  }

  copyFunctionName(): void {
    const {
      selectedStack,
      thread: { stringTable, funcTable, stackTable },
    } = this.props;

    const funcIndex = stackTable.func[selectedStack];
    const stringIndex = funcTable.name[funcIndex];
    const name = stringTable.getString(stringIndex);
    copy(name);
  }

  copyStack(): void {
    const {
      selectedStack,
      thread: { stringTable, funcTable, stackTable },
    } = this.props;

    let stack = '';
    let stackIndex = selectedStack;

    do {
      const funcIndex = stackTable.func[stackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack += stringTable.getString(stringIndex) + '\n';
      stackIndex = stackTable.prefix[stackIndex];
    } while (stackIndex !== -1);

    copy(stack);
  }

  _getPseudoStackString(stackIndex) {
    const {
      thread: {
        stringTable,
        funcTable,
        pseudoStackTable,
      },
    } = this.props;

    let stack = '';

    do {
      const funcIndex = pseudoStackTable.func[stackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack += stringTable.getString(stringIndex) + '\n';
      if (stackIndex == pseudoStackTable.prefix[stackIndex]) {
        break;
      }
      stackIndex = pseudoStackTable.prefix[stackIndex];
    } while (stackIndex !== -1);

    return stack;
  }

  viewPseudoStacks() {
    const {
      selectedStack,
      tree,
      thread: {
        stringTable,
        funcTable,
        stackTable,
        stackToPseudoStacksTable,
        stackToPseudoStacksIndex,
        pseudoStackTable,
      },
    } = this.props;

    const descendants = tree.getDescendants(selectedStack);
    const indices = stackToPseudoStacksIndex.getRowIndices(descendants);
    const weights = new Float32Array(pseudoStackTable.length);
    for (let index of indices) {
      weights[stackToPseudoStacksTable.pseudo_stack[index]] += stackToPseudoStacksTable.stackHangMs[index];
    }
    const pseudoStacks = Object.keys(weights);
    pseudoStacks.sort((lhs, rhs) => weights[rhs] - weights[lhs]);
    const topStacks = pseudoStacks.slice(0, 60).map(i => this._getPseudoStackString(i));
    const maxStackHangMs = weights[pseudoStacks[0]];
  }

  handleClick(event: SyntheticEvent, data: { type: string }): void {
    switch (data.type) {
      case 'copyFunctionName':
        this.copyFunctionName();
        break;
      case 'copyStack':
        this.copyStack();
        break;
      case 'viewPseudoStacks':
        this.viewPseudoStacks();
        break;
    }
  }

  render() {
    return (
      <ContextMenu id={'ProfileCallTreeContextMenu'}>
        <SubMenu title='Copy' hoverDelay={200}>
          <MenuItem onClick={this.handleClick} data={{type: 'copyFunctionName'}}>Function Name</MenuItem>
          <MenuItem onClick={this.handleClick} data={{type: 'copyStack'}}>Stack</MenuItem>
        </SubMenu>
        <MenuItem onClick={this.handleClick} data={{type: 'viewPseudoStacks'}}>View Pseudo-Stacks</MenuItem>
      </ContextMenu>
    );
  }
}

export default connect(state => ({
  thread: selectedThreadSelectors.getFilteredThread(state),
  selectedStack: selectedThreadSelectors.getSelectedStack(state),
  tree: selectedThreadSelectors.getCallTree(state),
}), actions)(ProfileCallTreeContextMenu);
