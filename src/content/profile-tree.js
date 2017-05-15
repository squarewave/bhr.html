// @flow
import { timeCode } from '../common/time-code';
import { UniqueStringArray } from './unique-string-array';
import type { Thread, StackTable, FuncTable, Lib, IndexIntoFuncTable, IndexIntoStackTable } from '../common/types/profile';
import type { Node } from '../common/types/profile-derived';
import type { Milliseconds } from '../common/types/units';

type StackChildren = IndexIntoStackTable[];
type StackTimes = { selfTime: Milliseconds, totalTime: Milliseconds };
type StackCounts = { selfCount: Milliseconds, totalCount: Milliseconds };

function extractFaviconFromLibname(libname: string): string | null {
  const url = new URL('/favicon.ico', libname);
  return url.href;
}

class ProfileTree {

  _stackTable: StackTable;
  _stackTimes: StackTimes;
  _stackCounts: StackCounts;
  _stackChildCount: Uint32Array; // A table column matching the stackTable
  _funcTable: FuncTable;
  _libs: Lib[];
  _stringTable: UniqueStringArray;
  _rootTotalTime: number;
  _rootTotalCount: number;
  _rootCount: number;
  _nodes: Map<IndexIntoStackTable, Node>;
  _children: Map<IndexIntoStackTable, StackChildren>;

  constructor(
    stackTable: StackTable,
    stackTimes: StackTimes,
    stackCounts: StackCounts,
    stackChildCount: Uint32Array,
    funcTable: FuncTable,
    libs: Lib[],
    stringTable: UniqueStringArray,
    rootTotalTime: number,
    rootTotalCount: number,
    rootCount: number
  ) {
    this._stackTable = stackTable;
    this._stackTimes = stackTimes;
    this._stackCounts = stackCounts;
    this._stackChildCount = stackChildCount;
    this._funcTable = funcTable;
    this._libs = libs;
    this._stringTable = stringTable;
    this._rootTotalTime = rootTotalTime;
    this._rootTotalCount = rootTotalCount;
    this._rootCount = rootCount;
    this._nodes = new Map();
    this._children = new Map();
  }

  getRoots() {
    return this.getChildren(-1);
  }

  /**
   * Return an array of stackIndex for the children of the node with index stackIndex.
   * @param  {[type]} stackIndex [description]
   * @return {[type]}            [description]
   */
  getChildren(stackIndex: IndexIntoStackTable): StackChildren {
    let children = this._children.get(stackIndex);
    if (children === undefined) {
      const childCount = stackIndex === -1 ? this._rootCount : this._stackChildCount[stackIndex];
      children = [];
      for (let childStackIndex = stackIndex + 1;
           childStackIndex < this._stackTable.length && children.length < childCount;
           childStackIndex++) {
        if (this._stackTable.prefix[childStackIndex] === stackIndex &&
            this._stackTimes.totalTime[childStackIndex] !== 0) {
          children.push(childStackIndex);
        }
      }
      children.sort((a, b) => this._stackTimes.totalTime[b] - this._stackTimes.totalTime[a]);
      this._children.set(stackIndex, children);
    }
    return children;
  }

  hasChildren(stackIndex: IndexIntoStackTable): boolean {
    return this.getChildren(stackIndex).length !== 0;
  }

  getParent(stackIndex: IndexIntoStackTable): IndexIntoStackTable {
    return this._stackTable.prefix[stackIndex];
  }

  hasSameNodeIds(tree: ProfileTree): boolean {
    return this._stackTable === tree._stackTable;
  }

  getDepth(stackIndex: IndexIntoStackTable): number {
    return this._stackTable.depth[stackIndex];
  }

  /**
   * Return an object with information about the node with index stackIndex.
   * @param  {[type]} stackIndex [description]
   * @return {[type]}                [description]
   */
  getNode(stackIndex: IndexIntoStackTable): Node {
    let node = this._nodes.get(stackIndex);
    if (node === undefined) {
      const funcIndex = this._stackTable.func[stackIndex];
      const funcName = this._stringTable.getString(this._funcTable.name[funcIndex]);
      const libName = this._getOriginAnnotation(funcIndex);

      node = {
        totalTimePercent: `${(100 * this._stackTimes.totalTime[stackIndex] / this._rootTotalTime).toFixed(1)}%`,
        selfTime: `${(100 * this._stackTimes.selfTime[stackIndex] / this._rootTotalTime).toFixed(1)}%`,
        totalCountPercent: `${(100 * this._stackCounts.totalCount[stackIndex] / this._rootTotalCount).toFixed(1)}%`,
        name: funcName,
        lib: libName,
        dim: false,
        icon: null,
      };
      this._nodes.set(stackIndex, node);
    }
    return node;
  }

  _getOriginAnnotation(funcIndex: IndexIntoFuncTable): string {
    const libIndex = this._funcTable.lib[funcIndex];
    if (libIndex !== null && this._libs[libIndex] !== undefined) {
      return this._libs[libIndex].debugName;
    }
    return '';
  }
}

export type ProfileTreeClass = ProfileTree;

export function getCallTree(
  thread: Thread
): ProfileTree {
  return timeCode('getCallTree', () => {
    const { allDates, stackTable } = thread;
    const numChildren = new Uint32Array(allDates.length);
    let rootTotalTime = 0;
    let rootTotalCount = 0;
    let numRoots = 0;
    for (let stackIndex = allDates.totalStackHangMs.length - 1; stackIndex >= 0; stackIndex--) {
      if (allDates.totalStackHangMs[stackIndex] === 0) {
        continue;
      }
      const prefixStack = stackTable.prefix[stackIndex];
      if (prefixStack === -1) {
        rootTotalTime += allDates.totalStackHangMs[stackIndex];
        rootTotalCount += allDates.totalStackHangCount[stackIndex];
        numRoots++;
      } else {
        numChildren[prefixStack]++;
      }
    }
    const stackTimes = { selfTime: allDates.stackHangMs, totalTime: allDates.totalStackHangMs };
    const stackCounts = { selfCount: allDates.stackHangCount, totalCount: allDates.totalStackHangCount };
    return new ProfileTree(
      stackTable, stackTimes, stackCounts, numChildren, thread.funcTable,
      thread.libs, thread.stringTable, rootTotalTime, rootTotalCount, numRoots
    );
  });
}
