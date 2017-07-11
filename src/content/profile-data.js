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
import { timeCode } from '../common/time-code';
import { sampleCategorizer } from '../common/summarize-profile';
import { OneToManyIndex } from './one-to-many-index';

const INVERTED_CALLSTACK_ROOT_THRESHOLD = 0.001;

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
  const knownOrders = {
    'Gecko': -3,
    'Gecko_Child': -2,
    'Gecko_Child_ForcePaint': -1,
  };
  threadOrder.sort((a, b) => {
    const nameA = threads[a].name;
    const nameB = threads[b].name;
    const orderingA = knownOrders[nameA] || 0;
    const orderingB = knownOrders[nameB] || 0;
    if (!orderingA && !orderingB) {
      return nameA.localeCompare(nameB);
    }
    return orderingA - orderingB;
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
      func: new Int32Array(stackTable.length),
      prefix: new Int32Array(stackTable.length),
      depth: new Int32Array(stackTable.length),
    };

    const oldStackToNewStack = new Map();
    const funcCount = funcTable.length;
    const prefixStackAndFuncToStack = new Map(); // prefixNewStack * funcCount + func => newStackIndex

    function convertStack(stackIndex) {
      if (stackIndex == -1) {
        return -1;
      }
      let newStack = oldStackToNewStack.get(stackIndex);
      if (newStack === undefined) {
        const prefixNewStack = convertStack(stackTable.prefix[stackIndex]);
        const funcIndex = stackTable.func[stackIndex];
        const depth = stackTable.depth[stackIndex];
        if (filter(funcIndex)) {
          const prefixStackAndFrameIndex = prefixNewStack * funcCount + funcIndex;
          newStack = prefixStackAndFuncToStack.get(prefixStackAndFrameIndex);
          if (newStack === undefined) {
            newStack = newStackTable.length++;
            newStackTable.prefix[newStack] = prefixNewStack;
            newStackTable.func[newStack] = funcIndex;
            newStackTable.depth[newStack] = depth;
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
    let newStackHangCount = new Float32Array(newStackTable.length);
    let newTotalStackHangMs = new Float32Array(newStackTable.length);
    let newTotalStackHangCount = new Float32Array(newStackTable.length);
    let newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Float32Array(newStackTable.length),
      totalStackHangMs: new Float32Array(newStackTable.length),
      totalStackHangCount: new Float32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newIndex = convertStack(i);
      if (newIndex != -1) {
        newStackHangMs[newIndex] += allDates.stackHangMs[i];
        newStackHangCount[newIndex] += allDates.stackHangCount[i];
        newTotalStackHangMs[newIndex] += allDates.totalStackHangMs[i];
        newTotalStackHangCount[newIndex] += allDates.totalStackHangCount[i];

        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newIndex] += dates[j].stackHangMs[i];
          newDates[j].totalStackHangMs[newIndex] += dates[j].totalStackHangMs[i];
          newDates[j].stackHangCount[newIndex] += dates[j].stackHangCount[i];
          newDates[j].totalStackHangCount[newIndex] += dates[j].totalStackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: {
        length: newStackTable.length,
        stackHangMs: newStackHangMs,
        stackHangCount: newStackHangCount,
        totalStackHangMs: newTotalStackHangMs,
        totalStackHangCount: newTotalStackHangCount,
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
      if (stackIndex === -1) {
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

    const result = Object.assign({}, thread, {
      allDates: Object.assign({}, allDates, {
        stackHangMs: allDates.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: allDates.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
        totalStackHangMs: new Float32Array(stackTable.length),
        totalStackHangCount: new Float32Array(stackTable.length),
      }),
      dates: dates.map(d => Object.assign({}, d, {
        stackHangMs: d.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: d.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
        totalStackHangMs: new Float32Array(stackTable.length),
        totalStackHangCount: new Float32Array(stackTable.length),
      }))
    });

    for (let i = result.allDates.length - 1; i >= 0; i--) {
      const prefix = stackTable.prefix[i];
      if (prefix != -1) {
        result.allDates.totalStackHangMs[i] += result.allDates.stackHangMs[i];
        result.allDates.totalStackHangCount[i] += result.allDates.stackHangCount[i];
        result.allDates.totalStackHangMs[prefix] += result.allDates.totalStackHangMs[i];
        result.allDates.totalStackHangCount[prefix] += result.allDates.totalStackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          result.dates[j].totalStackHangMs[i] += result.dates[j].stackHangMs[i];
          result.dates[j].totalStackHangCount[i] += result.dates[j].stackHangCount[i];
          result.dates[j].totalStackHangMs[prefix] += result.dates[j].totalStackHangMs[i];
          result.dates[j].totalStackHangCount[prefix] += result.dates[j].totalStackHangCount[i];
        }
      }
    }

    return result;
  });
}

export function filterThreadToCategory(thread: Thread, category: string) {
  return timeCode('filterThreadToCategory', () => {
    if (category === '') {
      return thread;
    }

    let matchCategory = category;
    if (matchCategory == 'uncategorized') {
      matchCategory = null;
    }
    const {
      allDates, dates, funcTable, stackTable, stringTable, libs
    } = thread;

    const categorizer = sampleCategorizer(thread);

    function stackMatchesFilter(stackIndex) {
      if (stackIndex === -1) {
        return false;
      }
      return categorizer(stackIndex) === matchCategory;
    }

    const result = Object.assign({}, thread, {
      allDates: Object.assign({}, allDates, {
        stackHangMs: allDates.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: allDates.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
        totalStackHangMs: new Float32Array(stackTable.length),
        totalStackHangCount: new Float32Array(stackTable.length),
      }),
      dates: dates.map(d => Object.assign({}, d, {
        stackHangMs: d.stackHangMs.map((s,i) => stackMatchesFilter(i) ? s : 0),
        stackHangCount: d.stackHangCount.map((s,i) => stackMatchesFilter(i) ? s : 0),
        totalStackHangMs: new Float32Array(stackTable.length),
        totalStackHangCount: new Float32Array(stackTable.length),
      }))
    });

    for (let i = result.allDates.length - 1; i >= 0; i--) {
      const prefix = stackTable.prefix[i];
      if (prefix != -1) {
        result.allDates.totalStackHangMs[i] += result.allDates.stackHangMs[i];
        result.allDates.totalStackHangCount[i] += result.allDates.stackHangCount[i];
        result.allDates.totalStackHangMs[prefix] += result.allDates.totalStackHangMs[i];
        result.allDates.totalStackHangCount[prefix] += result.allDates.totalStackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          result.dates[j].totalStackHangMs[i] += result.dates[j].stackHangMs[i];
          result.dates[j].totalStackHangCount[i] += result.dates[j].stackHangCount[i];
          result.dates[j].totalStackHangMs[prefix] += result.dates[j].totalStackHangMs[i];
          result.dates[j].totalStackHangCount[prefix] += result.dates[j].totalStackHangCount[i];
        }
      }
    }

    return result;
  });
}

/**
 * Filter thread to only contain stacks which start with |prefixFuncs|, and
 * only samples witth those stacks. The new stacks' roots will be frames whose
 * func is the last element of the prefix func array.
 * @param  {object} thread      The thread.
 * @param  {array} prefixFuncs  The prefix stack, as an array of funcs.
 * @return {object}             The filtered thread.
 */
export function filterThreadToPrefixStack(thread: Thread, prefixFuncs: IndexIntoFuncTable[]) {
  return timeCode('filterThreadToPrefixStack', () => {
    const { stackTable, funcTable, allDates, dates, stackToPseudoStacksTable } = thread;
    const prefixDepth = prefixFuncs.length;
    const stackMatches = new Int32Array(stackTable.length);
    const oldStackToNewStack = new Map();
    oldStackToNewStack.set(-1, -1);
    const newStackTable = {
      length: 0,
      prefix: new Int32Array(stackTable.length),
      func: new Int32Array(stackTable.length),
      depth: new Int32Array(stackTable.length),
    };
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const prefixMatchesUpTo = prefix !== -1 ? stackMatches[prefix] : 0;
      let stackMatchesUpTo = -1;
      if (prefixMatchesUpTo !== -1) {
        const func = stackTable.func[stackIndex];
        const depth = stackTable.depth[stackIndex];
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
          newStackTable.prefix[newStackIndex] = newStackPrefix !== undefined ? newStackPrefix : -1;
          newStackTable.func[newStackIndex] = func;
          newStackTable.depth[newStackIndex] = depth;
          oldStackToNewStack.set(stackIndex, newStackIndex);
        }
      }
      stackMatches[stackIndex] = stackMatchesUpTo;
    }

    const newAllDates = {
      length: newStackTable.length,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Float32Array(newStackTable.length),
      totalStackHangMs: new Float32Array(newStackTable.length),
      totalStackHangCount: new Float32Array(newStackTable.length),
    };
    const newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Float32Array(newStackTable.length),
      totalStackHangMs: new Float32Array(newStackTable.length),
      totalStackHangCount: new Float32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newStack = -1;
      if (stackMatches[i] === prefixDepth) {
        newStack = oldStackToNewStack.get(i);
      }

      if (newStack !== -1 && newStack !== undefined) {
        newAllDates.stackHangMs[newStack] += allDates.stackHangMs[i];
        newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        newAllDates.totalStackHangMs[newStack] += allDates.totalStackHangMs[i];
        newAllDates.totalStackHangCount[newStack] += allDates.totalStackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newStack] += dates[j].stackHangMs[i];
          newDates[j].stackHangCount[newStack] += dates[j].stackHangCount[i];
          newDates[j].totalStackHangMs[newStack] += dates[j].totalStackHangMs[i];
          newDates[j].totalStackHangCount[newStack] += dates[j].totalStackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      stackTable: newStackTable,
      allDates: newAllDates,
      dates: newDates,
    }, recomputeStacksToPseudoStacks(stackToPseudoStacksTable, oldStackToNewStack));
  });
}

/**
 * Filter thread to only contain stacks which end with |postfixFuncs|, and
 * only samples witth those stacks. The new stacks' leaf frames will be
 * frames whose func is the last element of the postfix func array.
 * @param  {object} thread      The thread.
 * @param  {array} postfixFuncs The postfix stack, as an array of funcs,
 *                              starting from the leaf func.
 * @return {object}             The filtered thread.
 */
export function filterThreadToPostfixStack(thread: Thread, postfixFuncs: IndexIntoFuncTable[]) {
  return timeCode('filterThreadToPostfixStack', () => {
    const postfixDepth = postfixFuncs.length;
    const { stackTable, funcTable, allDates, dates, stackToPseudoStacksTable } = thread;

    function convertStack(leaf) {
      let matchesUpToDepth = 0; // counted from the leaf
      for (let stack = leaf; stack !== -1; stack = stackTable.prefix[stack]) {
        const func = stackTable.func[stack];
        if (func === postfixFuncs[matchesUpToDepth]) {
          matchesUpToDepth++;
          if (matchesUpToDepth === postfixDepth) {
            return stack;
          }
        }
      }
      return -1;
    }

    const oldStackToNewStack = new Map();
    oldStackToNewStack.set(-1, -1);

    const newAllDates = {
      length: stackTable.length,
      stackHangMs: new Float32Array(stackTable.length),
      stackHangCount: new Float32Array(stackTable.length),
      totalStackHangMs: new Float32Array(stackTable.length),
      totalStackHangCount: new Float32Array(stackTable.length),
    };
    const newDates = dates.map(d => ({
      length: stackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(stackTable.length),
      stackHangCount: new Float32Array(stackTable.length),
      totalStackHangMs: new Float32Array(stackTable.length),
      totalStackHangCount: new Float32Array(stackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      let newStack = oldStackToNewStack.get(i);
      if (newStack === undefined) {
        newStack = convertStack(i);
        oldStackToNewStack.set(i, newStack);
      }

      if (newStack != -1) {
        newAllDates.stackHangMs[newStack] += allDates.stackHangMs[i];
        newAllDates.stackHangCount[newStack] += allDates.stackHangCount[i];
        newAllDates.totalStackHangMs[newStack] += allDates.totalStackHangMs[i];
        newAllDates.totalStackHangCount[newStack] += allDates.totalStackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          newDates[j].stackHangMs[newStack] += dates[j].stackHangMs[i];
          newDates[j].stackHangCount[newStack] += newDates[j].stackHangCount[i];
          newDates[j].totalStackHangMs[newStack] += dates[j].totalStackHangMs[i];
          newDates[j].totalStackHangCount[newStack] += newDates[j].totalStackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: newAllDates,
      dates: newDates,
    }, recomputeStacksToPseudoStacks(stackToPseudoStacksTable, oldStackToNewStack));
  });
}

export function filterThreadToRange(thread: Thread, rangeStart: number, rangeEnd: number) {
  const { dates, stackTable } = thread;
  let allDates = {
    length: stackTable.length,
    stackHangMs: new Float32Array(stackTable.length),
    stackHangCount: new Float32Array(stackTable.length),
    totalStackHangMs: new Float32Array(stackTable.length),
    totalStackHangCount: new Float32Array(stackTable.length),
  };

  let newDates = dates.slice(rangeStart, rangeEnd + 1);
  for (let date of newDates) {
    for (let i = 0; i < stackTable.length; i++) {
      allDates.stackHangMs[i] += date.stackHangMs[i];
      allDates.stackHangCount[i] += date.stackHangCount[i];
      allDates.totalStackHangMs[i] += date.totalStackHangMs[i];
      allDates.totalStackHangCount[i] += date.totalStackHangCount[i];
    }
  }

  return Object.assign({}, thread, {
    allDates,
  });
}

export function getStackFromFuncArray(funcArray: IndexIntoFuncTable[], stackTable: StackTable) {
  let fs = -1;
  for (let i = 0; i < funcArray.length; i++) {
    const func = funcArray[i];
    let nextFS = -1;
    for (let stackIndex = fs + 1; stackIndex < stackTable.length; stackIndex++) {
      if (stackTable.prefix[stackIndex] === fs &&
          stackTable.func[stackIndex] === func) {
        nextFS = stackIndex;
        break;
      }
    }
    if (nextFS === -1) {
      return nextFS;
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
    case 'Gecko_Child_ForcePaint':
      label = 'Content ForcePaint';
      break;
  }

  if (!label) {
    label = thread.name;
  }
  return label;
}

export function getStackAsFuncArray(stackIndex: IndexIntoStackTable, stackTable: StackTable): IndexIntoFuncTable[] {
  if (stackIndex === -1) {
    return [];
  }
  if (stackIndex * 1 !== stackIndex) {
    console.log('bad stackIndex in getStackAsFuncArray:', stackIndex);
    return [];
  }
  const funcArray = [];
  let fs = stackIndex;
  while (fs !== -1) {
    funcArray.push(stackTable.func[fs]);
    fs = stackTable.prefix[fs];
  }
  funcArray.reverse();
  return funcArray;
}

export function invertCallstack(thread: Thread): Thread {
  return timeCode('invertCallstack', () => {
    const { stackTable, funcTable, dates, allDates, stackToPseudoStacksTable } = thread;

    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
      depth: [],
    };
    // Create a Map that keys off of two values, both the prefix and frame combination
    // by using a bit of math: prefix * funcCount + func => stackIndex
    const prefixAndFuncToStack = new Map();
    const funcCount = funcTable.length;

    function stackFor(prefix, func) {
      const prefixAndFuncIndex = prefix * funcCount + func;
      let stackIndex = prefixAndFuncToStack.get(prefixAndFuncIndex);
      if (stackIndex === undefined) {
        stackIndex = newStackTable.length++;
        newStackTable.prefix.push(prefix);
        newStackTable.func.push(func);
        prefixAndFuncToStack.set(prefixAndFuncIndex, stackIndex);
      }
      return stackIndex;
    }

    const oldStackToNewStack = new Map();

    function convertStack(stackIndex) {
      if (stackIndex === -1 || allDates.totalStackHangCount[stackIndex] < INVERTED_CALLSTACK_ROOT_THRESHOLD) {
        return;
      }
      let newStack = oldStackToNewStack.get(stackIndex);
      if (newStack === undefined) {
        newStack = -1;
        for (let currentStack = stackIndex; currentStack !== -1; currentStack = stackTable.prefix[currentStack]) {
          newStack = stackFor(newStack, stackTable.func[currentStack]);
        }
        oldStackToNewStack.set(stackIndex, newStack);
      }
    }

    for (let i = 0; i < stackTable.length; i++) {
      convertStack(i);
    }

    let newStackHangMs = new Float32Array(newStackTable.length);
    let newStackHangCount = new Float32Array(newStackTable.length);
    let newTotalStackHangMs = new Float32Array(newStackTable.length);
    let newTotalStackHangCount = new Float32Array(newStackTable.length);
    let newDates = dates.map(d => ({
      length: newStackTable.length,
      date: d.date,
      stackHangMs: new Float32Array(newStackTable.length),
      stackHangCount: new Float32Array(newStackTable.length),
      totalStackHangMs: new Float32Array(newStackTable.length),
      totalStackHangCount: new Float32Array(newStackTable.length),
    }));

    for (let i = 0; i < stackTable.length; i++) {
      const newIndex = oldStackToNewStack.get(i);
      if (newIndex !== -1 && newIndex !== undefined) {
        if (allDates.stackHangCount[i]) {
          newStackHangMs[newIndex] += allDates.stackHangMs[i];
          newStackHangCount[newIndex] += allDates.stackHangCount[i];
          newTotalStackHangMs[newIndex] += allDates.stackHangMs[i];
          newTotalStackHangCount[newIndex] += allDates.stackHangCount[i];

          for (let j = 0; j < dates.length; j++) {
            newDates[j].stackHangMs[newIndex] += dates[j].stackHangMs[i];
            newDates[j].stackHangCount[newIndex] += dates[j].stackHangCount[i];
            newDates[j].totalStackHangMs[newIndex] += dates[j].stackHangMs[i];
            newDates[j].totalStackHangCount[newIndex] += dates[j].stackHangCount[i];
          }
        }
      }
    }

    for (let i = 0; i < newStackTable.length; i++) {
      const prefix = newStackTable.prefix[i];
      if (prefix == -1) {
        newStackTable.depth.push(0);
      } else {
        newStackTable.depth.push(1 + newStackTable.depth[newStackTable.prefix[i]]);
      }
    }

    for (let i = newStackTable.length - 1; i >= 0; i--) {
      const prefix = newStackTable.prefix[i];
      if (prefix != -1) {
        newTotalStackHangMs[prefix] += newTotalStackHangMs[i];
        newTotalStackHangCount[prefix] += newTotalStackHangCount[i];
        for (let j = 0; j < dates.length; j++) {
          newDates[j].totalStackHangMs[prefix] += newDates[j].totalStackHangMs[i];
          newDates[j].totalStackHangCount[prefix] += newDates[j].totalStackHangCount[i];
        }
      }
    }

    return Object.assign({}, thread, {
      allDates: {
        length: newStackTable.length,
        stackHangMs: newStackHangMs,
        stackHangCount: newStackHangCount,
        totalStackHangMs: newTotalStackHangMs,
        totalStackHangCount: newTotalStackHangCount,
      },
      dates: newDates,
      stackTable: newStackTable,
    }, recomputeStacksToPseudoStacks(stackToPseudoStacksTable, oldStackToNewStack));
  });
}

function recomputeStacksToPseudoStacks(stackToPseudoStacksTable, oldStackToNewStack) {
  return timeCode('recomputeStacksToPseudoStacks', () => {
    let newStackToPseudoStacksTable = {
      length: stackToPseudoStacksTable.length,
      stack: new Int32Array(stackToPseudoStacksTable.length),
      pseudo_stack: new Int32Array(stackToPseudoStacksTable.length),
      stackHangMs: new Float32Array(stackToPseudoStacksTable.length),
      stackHangCount: new Float32Array(stackToPseudoStacksTable.length),
    };

    let newStackToPseudoStacksStacksTemp = new Int32Array(stackToPseudoStacksTable.length);
    let newStackToPseudoStacksIndices = new Int32Array(stackToPseudoStacksTable.length);

    for (let i = 0; i < stackToPseudoStacksTable.length; i++) {
      newStackToPseudoStacksIndices[i] = i;

      const oldStackIndex = stackToPseudoStacksTable.stack[i];
      let newIndex = oldStackToNewStack.get(oldStackIndex);

      if (newIndex === undefined) {
        newIndex = -1;
      }
      newStackToPseudoStacksStacksTemp[i] = newIndex;
    }

    newStackToPseudoStacksIndices.sort((lhs, rhs) =>
      newStackToPseudoStacksStacksTemp[lhs] - newStackToPseudoStacksStacksTemp[rhs]);
    let sortLocations = new Int32Array(stackToPseudoStacksTable.length);

    for (let i = 0; i < stackToPseudoStacksTable.length; i++) {
      sortLocations[newStackToPseudoStacksIndices[i]] = i;
    }

    for (let unsortedIndex = 0; unsortedIndex < stackToPseudoStacksTable.length; unsortedIndex++) {
      const sortedIndex = sortLocations[unsortedIndex];

      newStackToPseudoStacksTable.stack[sortedIndex] = newStackToPseudoStacksStacksTemp[unsortedIndex];
      newStackToPseudoStacksTable.pseudo_stack[sortedIndex] = stackToPseudoStacksTable.pseudo_stack[unsortedIndex];
      newStackToPseudoStacksTable.stackHangMs[sortedIndex] = stackToPseudoStacksTable.stackHangMs[unsortedIndex];
      newStackToPseudoStacksTable.stackHangCount[sortedIndex] = stackToPseudoStacksTable.stackHangCount[unsortedIndex];
    }

    const stackToPseudoStacksIndex = new OneToManyIndex(newStackToPseudoStacksTable.stack);

    return {
      stackToPseudoStacksTable: newStackToPseudoStacksTable,
      stackToPseudoStacksIndex
    };
  });
}

export function getEmptyProfile(): Profile {
  return {
    threads: [],
    dates: [],
  };
}
