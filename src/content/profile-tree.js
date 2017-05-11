// @flow
import { timeCode } from '../common/time-code';
import { getDateFuncStacks } from './profile-data';
import { UniqueStringArray } from './unique-string-array';
import type { Thread, FuncTable, Lib, IndexIntoFuncTable } from '../common/types/profile';
import type { FuncStackTable, IndexIntoFuncStackTable, FuncStackInfo, Node } from '../common/types/profile-derived';
import type { Days } from '../common/types/units';

type FuncStackChildren = IndexIntoFuncStackTable[];
type FuncStackTimes = { selfTime: Days, totalTime: Days };

function extractFaviconFromLibname(libname: string): string | null {
  const url = new URL('/favicon.ico', libname);
  return url.href;
}

class ProfileTree {

  _funcStackTable: FuncStackTable;
  _funcStackTimes: FuncStackTimes;
  _funcStackChildCount: Uint32Array; // A table column matching the funcStackTable
  _funcTable: FuncTable;
  _libs: Lib[];
  _stringTable: UniqueStringArray;
  _rootTotalTime: number;
  _rootCount: number;
  _nodes: Map<IndexIntoFuncStackTable, Node>;
  _children: Map<IndexIntoFuncStackTable, FuncStackChildren>;

  constructor(
    funcStackTable: FuncStackTable,
    funcStackTimes: FuncStackTimes,
    funcStackChildCount: Uint32Array,
    funcTable: FuncTable,
    libs: Lib[],
    stringTable: UniqueStringArray,
    rootTotalTime: number,
    rootCount: number
  ) {
    this._funcStackTable = funcStackTable;
    this._funcStackTimes = funcStackTimes;
    this._funcStackChildCount = funcStackChildCount;
    this._funcTable = funcTable;
    this._libs = libs;
    this._stringTable = stringTable;
    this._rootTotalTime = rootTotalTime;
    this._rootCount = rootCount;
    this._nodes = new Map();
    this._children = new Map();
  }

  getRoots() {
    return this.getChildren(-1);
  }

  /**
   * Return an array of funcStackIndex for the children of the node with index funcStackIndex.
   * @param  {[type]} funcStackIndex [description]
   * @return {[type]}                [description]
   */
  getChildren(funcStackIndex: IndexIntoFuncStackTable): FuncStackChildren {
    let children = this._children.get(funcStackIndex);
    if (children === undefined) {
      const childCount = funcStackIndex === -1 ? this._rootCount : this._funcStackChildCount[funcStackIndex];
      children = [];
      for (let childFuncStackIndex = funcStackIndex + 1;
           childFuncStackIndex < this._funcStackTable.length && children.length < childCount;
           childFuncStackIndex++) {
        if (this._funcStackTable.prefix[childFuncStackIndex] === funcStackIndex &&
            this._funcStackTimes.totalTime[childFuncStackIndex] !== 0) {
          children.push(childFuncStackIndex);
        }
      }
      children.sort((a, b) => this._funcStackTimes.totalTime[b] - this._funcStackTimes.totalTime[a]);
      this._children.set(funcStackIndex, children);
    }
    return children;
  }

  hasChildren(funcStackIndex: IndexIntoFuncStackTable): boolean {
    return this.getChildren(funcStackIndex).length !== 0;
  }

  getParent(funcStackIndex: IndexIntoFuncStackTable): IndexIntoFuncStackTable {
    return this._funcStackTable.prefix[funcStackIndex];
  }

  getDepth(funcStackIndex: IndexIntoFuncStackTable): number {
    return this._funcStackTable.depth[funcStackIndex];
  }

  hasSameNodeIds(tree: ProfileTree): boolean {
    return this._funcStackTable === tree._funcStackTable;
  }

  /**
   * Return an object with information about the node with index funcStackIndex.
   * @param  {[type]} funcStackIndex [description]
   * @return {[type]}                [description]
   */
  getNode(funcStackIndex: IndexIntoFuncStackTable): Node {
    let node = this._nodes.get(funcStackIndex);
    if (node === undefined) {
      const funcIndex = this._funcStackTable.func[funcStackIndex];
      const funcName = this._stringTable.getString(this._funcTable.name[funcIndex]);
      const libName = this._getOriginAnnotation(funcIndex);

      node = {
        totalTime: `${this._funcStackTimes.totalTime[funcStackIndex].toFixed(1)}ms`,
        totalTimePercent: `${(100 * this._funcStackTimes.totalTime[funcStackIndex] / this._rootTotalTime).toFixed(1)}%`,
        selfTime: `${this._funcStackTimes.selfTime[funcStackIndex].toFixed(1)}ms`,
        name: funcName,
        lib: libName,
        dim: false,
        icon: null,
      };
      this._nodes.set(funcStackIndex, node);
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
  thread: Thread, funcStackInfo: FuncStackInfo
): ProfileTree {
  return timeCode('getCallTree', () => {
    const { funcStackTable, stackIndexToFuncStackIndex } = funcStackInfo;
    const dateFuncStacks = getDateFuncStacks(thread.allDates, stackIndexToFuncStackIndex);

    const funcStackSelfTime = new Float32Array(funcStackTable.length);
    const funcStackTotalTime = new Float32Array(funcStackTable.length);
    const numChildren = new Uint32Array(funcStackTable.length);
    for (let funcStackIndex = 0; funcStackIndex < dateFuncStacks.length; funcStackIndex++) {
      funcStackSelfTime[funcStackIndex] += dateFuncStacks.stackHangMs[funcStackIndex];
    }
    let rootTotalTime = 0;
    let numRoots = 0;
    for (let funcStackIndex = funcStackTotalTime.length - 1; funcStackIndex >= 0; funcStackIndex--) {
      funcStackTotalTime[funcStackIndex] += funcStackSelfTime[funcStackIndex];
      if (funcStackTotalTime[funcStackIndex] === 0) {
        continue;
      }
      const prefixFuncStack = funcStackTable.prefix[funcStackIndex];
      if (prefixFuncStack === -1) {
        rootTotalTime += funcStackTotalTime[funcStackIndex];
        numRoots++;
      } else {
        funcStackTotalTime[prefixFuncStack] += funcStackTotalTime[funcStackIndex];
        numChildren[prefixFuncStack]++;
      }
    }
    const funcStackTimes = { selfTime: funcStackSelfTime, totalTime: funcStackTotalTime };
    return new ProfileTree(
      funcStackTable, funcStackTimes, numChildren, thread.funcTable,
      thread.libs, thread.stringTable, rootTotalTime, numRoots
    );
  });
}
