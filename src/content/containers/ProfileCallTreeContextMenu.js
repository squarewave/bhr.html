// @flow
import React, { PureComponent } from 'react';
import { ContextMenu, MenuItem } from 'react-contextmenu';
import actions from '../actions';
import { convertToTransformType } from '../transforms';
import { connect } from 'react-redux';
import { selectedThreadSelectors } from '../reducers/profile-view';
import { getSelectedThreadIndex, getInvertCallstack } from '../reducers/url-state';
import { getFunctionName } from '../../common/function-info';
import copy from 'copy-to-clipboard';

import type { Thread, IndexIntoStackTable } from '../../common/types/profile';

require('./ProfileCallTreeContextMenu.css');

type Props = {
  thread: Thread,
  selectedStack: IndexIntoStackTable,
};

class ProfileCallTreeContextMenu extends PureComponent {

  constructor(props: Props) {
    super(props);
    (this: any)._handleClick = this._handleClick.bind(this);
  }

  _getFunctionName(): string {
    const {
      selectedStack,
      thread: { stringTable, funcTable, stackTable },
    } = this.props;

    if (selectedStack === null) {
      throw new Error(
        "The context menu assumes there is a selected call node and there wasn't one."
      );
    }

    const funcIndex = stackTable.func[selectedStack];
    const stringIndex = funcTable.name[funcIndex];
    const functionCall = stringTable.getString(stringIndex);
    return getFunctionName(functionCall);
  }

  copyFunctionName(): void {
    copy(this.getFunctionName());
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

  _handleClick(event: SyntheticEvent, data: { type: string }): void {
    const transformType = convertToTransformType(data.type);
    if (transformType) {
      this.addTransformToStack(transformType);
      return;
    }

    switch (data.type) {
      case 'searchfox':
        this.lookupFunctionOnSearchfox();
        break;
      case 'copy-function-name':
        this.copyFunctionName();
        break;
      case 'copy-stack':
        this.copyStack();
        break;
      default:
        throw new Error(`Unknown type ${type}`);
    }
  }

  addTransformToStack(type: TransformType): void {
    const {
      addTransformToStack,
      threadIndex,
      selectedFuncPath,
      inverted,
      thread,
    } = this.props;
    const selectedFunc = selectedFuncPath[selectedFuncPath.length - 1];

    switch (type) {
      case 'focus-subtree':
        addTransformToStack(threadIndex, {
          type: 'focus-subtree',
          funcPath: selectedFuncPath,
          implementation: 'combined',
          inverted,
        });
        break;
      case 'focus-function':
        addTransformToStack(threadIndex, {
          type: 'focus-function',
          funcIndex: selectedFunc,
        });
        break;
      case 'merge-path-into-caller':
        addTransformToStack(threadIndex, {
          type: 'merge-path-into-caller',
          funcPath: selectedFuncPath,
          implementation: 'combined',
        });
        break;
      case 'merge-function':
        addTransformToStack(threadIndex, {
          type: 'merge-function',
          funcIndex: selectedFunc,
        });
        break;
      case 'drop-function':
        addTransformToStack(threadIndex, {
          type: 'drop-function',
          funcIndex: selectedFunc,
        });
        break;
      case 'collapse-lib': {
        const { funcTable } = thread;
        const libIndex = funcTable.lib[selectedFunc];
        // A new collapsed func will be inserted into the table at the end. Deduce
        // the index here.
        const collapsedFuncIndex = funcTable.length;
        addTransformToStack(threadIndex, {
          type: 'collapse-lib',
          libIndex,
          collapsedFuncIndex,
          implementation: 'combined',
        });
        break;
      }
      case 'collapse-direct-recursion': {
        addTransformToStack(threadIndex, {
          type: 'collapse-direct-recursion',
          funcIndex: selectedFunc,
          implementation: 'combined',
        });
        break;
      }
      case 'collapse-function-subtree': {
        addTransformToStack(threadIndex, {
          type: 'collapse-function-subtree',
          funcIndex: selectedFunc,
        });
        break;
      }
      default:
        assertExhaustiveCheck(type);
    }
  }

  getNameForSelectedResource() {
    const {
      selectedStack,
      thread: { funcTable, stackTable, libs },
    } = this.props;
    if (selectedStack == -1) {
      return null;
    }
    const funcIndex = stackTable.func[selectedStack];
    const libIndex = funcTable.lib[funcIndex];
    if (libIndex === null) {
      return null;
    }
    return libs[libIndex].name;
  }

  lookupFunctionOnSearchfox(): void {
    const name = this._getFunctionName();
    window.open(
      `https://searchfox.org/mozilla-central/search?q=${encodeURIComponent(
        name
      )}`,
      '_blank'
    );
  }

  /**
   * Determine if this CallNode represent a recursive function call.
   */
  isRecursiveCall() {
    const { selectedStack, thread } = this.props;
    const funcIndex = selectedStack[selectedStack.length - 1];
    if (funcIndex === undefined) {
      return false;
    }
    // Do the easy thing first, see if this function was called by itself.
    if (selectedStack[selectedStack.length - 2] === funcIndex) {
      return true;
    }

    // Do a full check of the stackTable for recursion.
    return funcHasRecursiveCall(thread, 'combined', funcIndex);
  }

  render() {
    const {
      selectedStack,
      inverted,
      thread: { funcTable, stackTable },
    } = this.props;

    if (selectedStack === null) {
      return <div />;
    }

    const funcIndex = stackTable.func[selectedStack];
    // This could be the C++ library, or the JS filename.
    const nameForResource = this.getNameForSelectedResource();

    return (
      <ContextMenu id={'ProfileCallTreeContextMenu'}>
        {inverted ? null : (
          <MenuItem
            onClick={this._handleClick}
            data={{ type: 'merge-path-into-caller' }}
          >
            <span className="callNodeContextMenuIcon callNodeContextMenuIconMerge" />
            Merge node into calling function
          </MenuItem>
        )}
        <MenuItem onClick={this._handleClick} data={{ type: 'merge-function' }}>
          <span className="callNodeContextMenuIcon callNodeContextMenuIconMerge" />
          Merge function into caller across the entire tree
        </MenuItem>
        <MenuItem onClick={this._handleClick} data={{ type: 'focus-subtree' }}>
          <span className="callNodeContextMenuIcon callNodeContextMenuIconFocus" />
          Focus on subtree
        </MenuItem>
        <MenuItem onClick={this._handleClick} data={{ type: 'focus-function' }}>
          <span className="callNodeContextMenuIcon callNodeContextMenuIconFocus" />
          {inverted
            ? 'Focus on calls made by this function'
            : 'Focus on function'}
        </MenuItem>
        <MenuItem
          onClick={this._handleClick}
          data={{ type: 'collapse-function-subtree' }}
        >
          <span className="callNodeContextMenuIcon callNodeContextMenuIconCollapse" />
          {'Collapse function’s subtree across the entire tree'}
        </MenuItem>
        {nameForResource ? (
          <MenuItem
            onClick={this._handleClick}
            data={{ type: 'collapse-lib' }}
          >
            <span className="callNodeContextMenuIcon callNodeContextMenuIconCollapse" />
            Collapse functions in{' '}
            <span className="callNodeContextMenuLabel">{nameForResource}</span>
          </MenuItem>
        ) : null}
        {this.isRecursiveCall() ? (
          <MenuItem
            onClick={this._handleClick}
            data={{ type: 'collapse-direct-recursion' }}
          >
            <span className="callNodeContextMenuIcon callNodeContextMenuIconCollapse" />
            Collapse direct recursion
          </MenuItem>
        ) : null}
        <MenuItem onClick={this._handleClick} data={{ type: 'drop-function' }}>
          <span className="callNodeContextMenuIcon callNodeContextMenuIconDrop" />
          Drop samples with this function
        </MenuItem>
        <div className="react-contextmenu-separator" />
        <MenuItem onClick={this._handleClick} data={{ type: 'searchfox' }}>
          Look up the function name on Searchfox
        </MenuItem>
        <MenuItem
          onClick={this._handleClick}
          data={{ type: 'copy-function-name' }}
        >
          Copy function name
        </MenuItem>
        <MenuItem onClick={this._handleClick} data={{ type: 'copy-stack' }}>
          Copy stack
        </MenuItem>
      </ContextMenu>
    );
  }
}

export default connect(state => ({
  thread: selectedThreadSelectors.getFilteredThread(state),
  threadIndex: getSelectedThreadIndex(state),
  selectedStack: selectedThreadSelectors.getSelectedStack(state),
  selectedFuncPath: selectedThreadSelectors.getSelectedStackAsFuncArray(state),
  tree: selectedThreadSelectors.getCallTree(state),
  inverted: getInvertCallstack(state),
}), actions)(ProfileCallTreeContextMenu);
