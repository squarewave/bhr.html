// @flow
import type {
  Profile,
  Thread,
  AllDatesTable,
  StackTable,
  FuncTable,
  IndexIntoFuncTable,
  IndexIntoStringTable,
  IndexIntoStackTable,
} from '../common/types/profile';
import type { FuncStackTable, IndexIntoFuncStackTable } from '../common/types/profile-derived';
import { timeCode } from '../common/time-code';

/**
 * Takes the stack table and the frame table, creates a func stack table and
 * returns a map from each stack to its corresponding func stack which can be
 * used to provide funcStack information for the samples data.
 * @param  {Object} stackTable The thread's stackTable.
 * @param  {Object} frameTable The thread's frameTable.
 * @param  {Object} funcTable  The thread's funcTable.
 * @return {Object}            The funcStackTable and the stackIndexToFuncStackIndex map.
 */
export function getFuncStackInfo(stackTable: StackTable, funcTable: FuncTable) {
  return timeCode('getFuncStackInfo', () => {
    const stackIndexToFuncStackIndex = new Uint32Array(stackTable.length);
    const funcCount = funcTable.length;
    const prefixFuncStackAndFuncToFuncStackMap = new Map(); // prefixFuncStack * funcCount + func => funcStack

    // The funcStackTable components.
    const prefix: Array<number> = [];
    const func: Array<number> = [];
    const depth: Array<number> = [];
    let length = 0;

    function addFuncStack(prefixIndex, funcIndex) {
      const index = length++;
      prefix[index] = prefixIndex;
      func[index] = funcIndex;
      if (prefixIndex === -1) {
        depth[index] = 0;
      } else {
        depth[index] = depth[prefixIndex] + 1;
      }
    }

    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefixStack = stackTable.prefix[stackIndex];
      // assert(prefixStack === null || prefixStack < stackIndex);
      const prefixFuncStack = (prefixStack === null) ? -1 :
         stackIndexToFuncStackIndex[prefixStack];
      const funcIndex = stackTable.func[stackIndex];
      const prefixFuncStackAndFuncIndex = prefixFuncStack * funcCount + funcIndex;
      let funcStackIndex = prefixFuncStackAndFuncToFuncStackMap.get(prefixFuncStackAndFuncIndex);
      if (funcStackIndex === undefined) {
        funcStackIndex = length;
        addFuncStack(prefixFuncStack, funcIndex);
        prefixFuncStackAndFuncToFuncStackMap.set(prefixFuncStackAndFuncIndex, funcStackIndex);
      }
      stackIndexToFuncStackIndex[stackIndex] = funcStackIndex;
    }

    const funcStackTable: FuncStackTable = {
      prefix: new Int32Array(prefix),
      func: new Int32Array(func),
      depth,
      length,
    };

    return { funcStackTable, stackIndexToFuncStackIndex };
  });
}

export function getDateFuncStacks(allDates: AllDatesTable, stackIndexToFuncStackIndex: Uint32Array) {
  let result = {
    length: allDates.length,
    stackHangMs: new Float32Array(allDates.length),
    stackHangCount: new Int32Array(allDates.length),
  };

  for (let i = 0; i < allDates.length; i++) {
    let newIndex = stackIndexToFuncStackIndex[i];
    result.stackHangMs[newIndex] += allDates.stackHangMs[i];
    result.stackHangCount[newIndex] += allDates.stackHangCount[i];
  }

  return result;
}

function getTimeRangeForThread(thread: Thread) {
  if (thread.dates.length === 0) {
    return { start: 0, end: 1 };
  }
  return { start: 0, end: thread.dates.length - 1 };
}

export function getTimeRangeIncludingAllThreads(profile: Profile) {
  const completeRange = { start: Infinity, end: -Infinity };

  profile.threads.forEach(thread => {
    const threadRange = getTimeRangeForThread(thread);
    completeRange.start = Math.min(completeRange.start, threadRange.start);
    completeRange.end = Math.max(completeRange.end, threadRange.end);
  });
  return completeRange;
}

export function defaultThreadOrder(threads: Thread[]) {
  // Put the compositor thread last.
  const threadOrder = threads.map((thread, i) => i);
  threadOrder.sort((a, b) => {
    const nameA = threads[a].name;
    const nameB = threads[b].name;
    if (nameA === nameB) {
      return a - b;
    }
    return (nameA === 'Compositor') ? 1 : -1;
  });
  return threadOrder;
}

function _filterThreadByFunc(
  thread: Thread,
  filter: IndexIntoFuncTable => boolean
): Thread {
  return timeCode('filterThread', () => {
    const { stackTable, funcTable, allDates, dates } = thread;

    const newStackTable = {
      length: 0,
      func: [],
      prefix: [],
    };

    const oldStackToNewStack = new Map();
    const funcCount = funcTable.length;
    const prefixStackAndFuncToStack = new Map(); // prefixNewStack * funcCount + func => newStackIndex

    function convertStack(stackIndex) {
      if (stackIndex === null) {
        return null;
      }
      let newStack = oldStackToNewStack.get(stackIndex);
      if (newStack === undefined) {
        const prefixNewStack = convertStack(stackTable.prefix[stackIndex]);
        const funcIndex = stackTable.func[stackIndex];
        if (filter(funcIndex)) {
          const prefixStackAndFrameIndex = (prefixNewStack === null ? -1 : prefixNewStack) * funcCount + funcIndex;
          newStack = prefixStackAndFuncToStack.get(prefixStackAndFrameIndex);
          if (newStack === undefined) {
            newStack = newStackTable.length++;
            newStackTable.prefix[newStack] = prefixNewStack;
            newStackTable.func[newStack] = funcIndex;
          }
          oldStackToNewStack.set(stackIndex, newStack);
          prefixStackAndFuncToStack.set(prefixStackAndFrameIndex, newStack);
        } else {
          newStack = prefixNewStack;
        }
      }
      return newStack;
    }

    let newStackHangMs = new Float32Array(newStackTable.length);
    let newStackHangCount = new Int32Array(newStackTable.length);
    let newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Int32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newIndex = convertStack(i);
      if (newIndex) {
        newStackHangMs[newIndex] += allDates.stackHangMs[i];
        newStackHangCount[newIndex] += allDates.stackHangCount[i];

        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newIndex] += dates[j].stackHangMs[i];
          newDates[j].stackHangCount[newIndex] += dates[j].stackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: {
        length: newStackTable.length,
        stackHangMs: newStackHangMs,
        stackHangCount: newStackHangCount,
      },
      dates: newDates,
      stackTable: newStackTable,
    });
  });
}

export function filterThreadToSearchString(thread: Thread, searchString: string) {
  return timeCode('filterThreadToSearchString', () => {
    if (searchString === '') {
      return thread;
    }
    const lowercaseSearchString = searchString.toLowerCase();
    const {
      allDates, dates, funcTable, stackTable, stringTable, libs
    } = thread;

    function computeFuncMatchesFilter(func) {
      const nameIndex = funcTable.name[func];
      const nameString = stringTable.getString(nameIndex);
      if (nameString.toLowerCase().includes(lowercaseSearchString)) {
        return true;
      }

      const libIndex = funcTable.lib[func];
      const lib = libs[libIndex];
      if (lib !== undefined) {
        if (lib.name.toLowerCase().includes(lowercaseSearchString)) {
          return true;
        }
      }

      return false;
    }

    const funcMatchesFilterCache = new Map();
    function funcMatchesFilter(func) {
      let result = funcMatchesFilterCache.get(func);
      if (result === undefined) {
        result = computeFuncMatchesFilter(func);
        funcMatchesFilterCache.set(func, result);
      }
      return result;
    }

    const stackMatchesFilterCache = new Map();
    function stackMatchesFilter(stackIndex) {
      if (stackIndex === null) {
        return false;
      }
      let result = stackMatchesFilterCache.get(stackIndex);
      if (result === undefined) {
        const prefix = stackTable.prefix[stackIndex];
        if (stackMatchesFilter(prefix)) {
          result = true;
        } else {
          const func = stackTable.func[stackIndex];
          result = funcMatchesFilter(func);
        }
        stackMatchesFilterCache.set(stackIndex, result);
      }
      return result;
    }

    return Object.assign({}, thread, {
      allDates: Object.assign({}, allDates, {
        stackHangMs: allDates.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: allDates.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
      }),
      dates: dates.map(d => Object.assign({}, d, {
        stackHangMs: d.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: d.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
      }))
    });
  });
}

/**
 * Filter thread to only contain stacks which start with |prefixFuncs|, and
 * only samples witth those stacks. The new stacks' roots will be frames whose
 * func is the last element of the prefix func array.
 * @param  {object} thread      The thread.
 * @param  {array} prefixFuncs  The prefix stack, as an array of funcs.
 * @param  {bool} matchJSOnly   Ignore non-JS frames during matching.
 * @return {object}             The filtered thread.
 */
export function filterThreadToPrefixStack(thread: Thread, prefixFuncs: IndexIntoFuncTable[]) {
  return timeCode('filterThreadToPrefixStack', () => {
    const { stackTable, funcTable, allDates, dates } = thread;
    const prefixDepth = prefixFuncs.length;
    const stackMatches = new Int32Array(stackTable.length);
    const oldStackToNewStack = new Map();
    oldStackToNewStack.set(null, null);
    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
    };
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const prefixMatchesUpTo = prefix !== null ? stackMatches[prefix] : 0;
      let stackMatchesUpTo = -1;
      if (prefixMatchesUpTo !== -1) {
        const func = stackTable.func[stackIndex];
        if (prefixMatchesUpTo === prefixDepth) {
          stackMatchesUpTo = prefixDepth;
        } else {
          if (func === prefixFuncs[prefixMatchesUpTo]) {
            stackMatchesUpTo = prefixMatchesUpTo + 1;
          }
        }
        if (stackMatchesUpTo === prefixDepth) {
          const newStackIndex = newStackTable.length++;
          const newStackPrefix = oldStackToNewStack.get(prefix);
          newStackTable.prefix[newStackIndex] = newStackPrefix !== undefined ? newStackPrefix : null;
          newStackTable.func[newStackIndex] = func;
          oldStackToNewStack.set(stackIndex, newStackIndex);
        }
      }
      stackMatches[stackIndex] = stackMatchesUpTo;
    }

    const newAllDates = {
      length: newStackTable.length,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Int32Array(newStackTable.length),
    };
    const newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Int32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newStack = null;
      if (stackMatches[i] === prefixDepth) {
        newStack = oldStackToNewStack.get(i);
      }

      if (newStack !== null && newStack !== undefined) {
        newAllDates.stackHangMs[newStack] += allDates.stackHangMs[i];
        newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newStack] += dates[j].stackHangMs[newStack];
          newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      stackTable: newStackTable,
      allDates: newAllDates,
      dates: newDates,
    });
  });
}

/**
 * Filter thread to only contain stacks which end with |postfixFuncs|, and
 * only samples witth those stacks. The new stacks' leaf frames will be
 * frames whose func is the last element of the postfix func array.
 * @param  {object} thread      The thread.
 * @param  {array} postfixFuncs The postfix stack, as an array of funcs,
 *                              starting from the leaf func.
 * @param  {bool} matchJSOnly   Ignore non-JS frames during matching.
 * @return {object}             The filtered thread.
 */
export function filterThreadToPostfixStack(thread: Thread, postfixFuncs: IndexIntoFuncTable[]) {
  return timeCode('filterThreadToPostfixStack', () => {
    const postfixDepth = postfixFuncs.length;
    const { stackTable, funcTable, allDates, dates } = thread;

    function convertStack(leaf) {
      let matchesUpToDepth = 0; // counted from the leaf
      for (let stack = leaf; stack !== null; stack = stackTable.prefix[stack]) {
        const func = stackTable.func[stack];
        if (func === postfixFuncs[matchesUpToDepth]) {
          matchesUpToDepth++;
          if (matchesUpToDepth === postfixDepth) {
            return stack;
          }
        }
      }
      return null;
    }

    const oldStackToNewStack = new Map();
    oldStackToNewStack.set(null, null);

    const newAllDates = {
      length: stackTable.length,
      stackHangMs: new Float32Array(stackTable.length),
      stackHangCount: new Int32Array(stackTable.length),
    };
    const newDates = dates.map(d => ({
      length: stackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(stackTable.length),
      stackHangCount: new Int32Array(stackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newStack = oldStackToNewStack.get(i);
      if (newStack === undefined) {
        newStack = convertStack(i);
        oldStackToNewStack.set(i, newStack);
      }

      if (newStack !== null) {
        newAllDates.stackHangMs[newStack] += allDates.stackHangMs[i];
        newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newStack] += dates[j].stackHangMs[newStack];
          newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: newAllDates,
      dates: newDates,
    });
  });
}

export function filterThreadToRange(thread: Thread, rangeStart: number, rangeEnd: number) {
  const { dates, stackTable } = thread;
  let allDates = {
    length: stackTable.length,
    stackHangMs: new Float32Array(stackTable.length),
    stackHangCount: new Int32Array(stackTable.length),
  };

  let newDates = dates.slice(rangeStart, rangeEnd);
  for (let date of newDates) {
    for (let i = 0; i < stackTable.length; i++) {
      allDates.stackHangMs[i] += date.stackHangMs[i];
      allDates.stackHangCount[i] += date.stackHangCount[i];
    }
  }

  return Object.assign({}, thread, {
    allDates,
    dates: newDates,
  });
}

export function getFuncStackFromFuncArray(funcArray: IndexIntoFuncTable[], funcStackTable: FuncStackTable) {
  let fs = -1;
  for (let i = 0; i < funcArray.length; i++) {
    const func = funcArray[i];
    let nextFS = -1;
    for (let funcStackIndex = fs + 1; funcStackIndex < funcStackTable.length; funcStackIndex++) {
      if (funcStackTable.prefix[funcStackIndex] === fs &&
          funcStackTable.func[funcStackIndex] === func) {
        nextFS = funcStackIndex;
        break;
      }
    }
    if (nextFS === -1) {
      return null;
    }
    fs = nextFS;
  }
  return fs;
}

export function getFriendlyThreadName(threads: Thread[], thread: Thread): string {
  let label;
  switch (thread.name) {
    case 'Gecko':
      label = 'Main Thread';
      break;
    case 'Gecko_Child':
      label = 'Content';
      break;
  }

  if (!label) {
    label = thread.name;
  }
  return label;
}

export function getStackAsFuncArray(funcStackIndex: IndexIntoFuncStackTable, funcStackTable: FuncStackTable): IndexIntoFuncTable[] {
  if (funcStackIndex === null) {
    return [];
  }
  if (funcStackIndex * 1 !== funcStackIndex) {
    console.log('bad funcStackIndex in getStackAsFuncArray:', funcStackIndex);
    return [];
  }
  const funcArray = [];
  let fs = funcStackIndex;
  while (fs !== -1) {
    funcArray.push(funcStackTable.func[fs]);
    fs = funcStackTable.prefix[fs];
  }
  funcArray.reverse();
  return funcArray;
}

export function invertCallstack(thread: Thread): Thread {
  return timeCode('invertCallstack', () => {
    const { stackTable, funcTable, dates, allDates } = thread;

    const newStackTable = {
      length: 0,
      func: [],
      prefix: [],
    };
    // Create a Map that keys off of two values, both the prefix and frame combination
    // by using a bit of math: prefix * funcCount + func => stackIndex
    const prefixAndFuncToStack = new Map();
    const funcCount = funcTable.length;

    function stackFor(prefix, func) {
      const prefixAndFuncIndex = (prefix === null ? -1 : prefix) * funcCount + func;
      let stackIndex = prefixAndFuncToStack.get(prefixAndFuncIndex);
      if (stackIndex === undefined) {
        stackIndex = newStackTable.length++;
        newStackTable.prefix[stackIndex] = prefix;
        newStackTable.func[stackIndex] = func;
        prefixAndFuncToStack.set(prefixAndFuncIndex, stackIndex);
      }
      return stackIndex;
    }

    const oldStackToNewStack = new Map();

    function convertStack(stackIndex) {
      if (stackIndex === null) {
        return null;
      }
      let newStack = oldStackToNewStack.get(stackIndex);
      if (newStack === undefined) {
        newStack = null;
        for (let currentStack = stackIndex; currentStack !== null; currentStack = stackTable.prefix[currentStack]) {
          newStack = stackFor(newStack, stackTable.func[currentStack]);
        }
        oldStackToNewStack.set(stackIndex, newStack);
      }
      return newStack;
    }


    let newStackHangMs = new Float32Array(newStackTable.length);
    let newStackHangCount = new Int32Array(newStackTable.length);
    let newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Int32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newIndex = convertStack(i);
      if (newIndex) {
        newStackHangMs[newIndex] += allDates.stackHangMs[i];
        newStackHangCount[newIndex] += allDates.stackHangCount[i];

        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newIndex] += dates[j].stackHangMs[i];
          newDates[j].stackHangCount[newIndex] += dates[j].stackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: {
        length: newStackTable.length,
        stackHangMs: newStackHangMs,
        stackHangCount: newStackHangCount,
      },
      dates: newDates,
      stackTable: newStackTable,
    });
  });
}

export function getEmptyProfile(): Profile {
  return {
    threads: [],
  };
}
