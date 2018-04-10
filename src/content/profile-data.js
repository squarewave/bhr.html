// @flow
import type {
  Profile,
  Thread,
  UsageHoursByDate,
  AllDatesTable,
  StackTable,
  FuncTable,
  IndexIntoFuncTable,
  IndexIntoStringTable,
  IndexIntoStackTable,
} from '../common/types/profile';
import { timeCode } from '../common/time-code';
import { hashPath } from '../common/path';
import { objectValues, friendlyThreadName } from '../common/utils';
import { sampleCategorizer, categoryNames } from '../common/profile-categories';
import { OneToManyIndex } from './one-to-many-index';

const INVERTED_CALLSTACK_ROOT_THRESHOLD = 0.001;

export function toValidImplementationFilter(
  implementation: string
): string {
  switch (implementation) {
    case 'cpp':
    case 'js':
      return implementation;
    default:
      return 'combined';
  }
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

export function filterThreadToSearchString(thread: Thread, searchString: string) {
  return timeCode('filterThreadToSearchString', () => {
    if (searchString === '') {
      return thread;
    }
    const lowercaseSearchString = searchString.toLowerCase();
    const {
      sampleTable,
      funcTable,
      stackTable,
      stringTable,
    } = thread;

    function computeFuncMatchesFilter(func) {
      const nameIndex = funcTable.name[func];
      const nameString = stringTable.getString(nameIndex);
      if (nameString.toLowerCase().includes(lowercaseSearchString)) {
        return true;
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
      if (stackIndex === null || stackIndex === -1) {
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
      sampleTable: Object.assign({}, sampleTable, {
        stack: sampleTable.stack.map(s => (stackMatchesFilter(s) ? s : null)),
      }),
    });
  });
}

const categorizerMemo = new Map();

export function filterThreadToCategory(thread: Thread, category: string) {
  return timeCode('filterThreadToCategory', () => {
    if (category == 'all') {
      return thread;
    }

    let categorySet;
    if (category[0] == '-') {
      categorySet = new Set(categoryNames);
      category.substr(1).split(',').forEach(c => categorySet.delete(c));
    } else {
      categorySet = new Set(category.split(','));
    }

    const {
      sampleTable,
    } = thread;

    const categorizer = sampleCategorizer(thread);
    function categorize(sampleIndex) {
      let memo = categorizerMemo.get(sampleIndex);
      if (memo === undefined) {
        memo = categorizer(sampleIndex) || 'uncategorized';
        categorizerMemo.set(sampleIndex, memo);
      }
      return memo;
    }

    return Object.assign({}, thread, {
      sampleTable: Object.assign({}, sampleTable, {
        stack: sampleTable.stack.map((s, i) => s !== null && categorySet.has(categorize(i)) ? s : null),
      }),
    });
  });
}

export function filterThreadToPlatform(thread: Thread, platform: string) {
  return timeCode('filterThreadToPlatform', () => {
    if (!platform) {
      return thread;
    }

    const {
      sampleTable,
      stringTable,
    } = thread;

    function filterSample(stackIndex, sampleIndex) {
      if (stackIndex === null) {
        return null;
      }

      const samplePlatform = stringTable.getString(sampleTable.platform[sampleIndex]);

      return samplePlatform === platform ? stackIndex : null;
    }

    return Object.assign({}, thread, {
      sampleTable: Object.assign({}, sampleTable, {
        stack: sampleTable.stack.map(filterSample),
      }),
    });
  });
}

export function filterThreadToRunnable(thread: Thread, runnable: string) {
  return timeCode('filterThreadToRunnable', () => {
    if (runnable === null) {
      return thread;
    }

    const {
      sampleTable,
      stringTable,
    } = thread;

    function filterSample(stackIndex, sampleIndex) {
      if (stackIndex === null) {
        return null;
      }

      const sampleRunnable = stringTable.getString(sampleTable.runnable[sampleIndex]) || '???';

      return sampleRunnable === runnable ? stackIndex : null;
    }

    return Object.assign({}, thread, {
      sampleTable: Object.assign({}, sampleTable, {
        stack: sampleTable.stack.map(filterSample),
      }),
    });
  });
}

export function filterThreadToUserInteracting(thread: Thread, userInteracting: boolean) {
  return timeCode('filterThreadToUserInteracting', () => {
    const { sampleTable } = thread;
    return Object.assign({}, thread, {
      sampleTable: Object.assign({}, sampleTable, {
        stack: sampleTable.stack.map((s, i) => (sampleTable.userInteracting[i] === userInteracting) ? s : null),
      }),
    });
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
    const { stackTable, funcTable, sampleTable } = thread;
    const prefixDepth = prefixFuncs.length;
    const stackMatches = new Int32Array(stackTable.length);
    const oldStackToNewStack: Map<
      IndexIntoStackTable | null,
      IndexIntoStackTable | null
    > = new Map();
    oldStackToNewStack.set(null, null);
    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
    };
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const prefixMatchesUpTo = (prefix !== null && prefix !== -1) ? stackMatches[prefix] : 0;
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
          newStackTable.prefix[newStackIndex] =
            newStackPrefix !== undefined ? newStackPrefix : -1;
          newStackTable.func[newStackIndex] = func;
          oldStackToNewStack.set(stackIndex, newStackIndex);
        }
      }
      stackMatches[stackIndex] = stackMatchesUpTo;
    }
    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(oldStack => {
        if (oldStack === null || stackMatches[oldStack] !== prefixDepth) {
          return null;
        }
        const newStack = oldStackToNewStack.get(oldStack);
        if (newStack === undefined) {
          throw new Error(
            'Converting from the old stack to a new stack cannot be undefined'
          );
        }
        return newStack;
      }),
    });
    return Object.assign({}, thread, {
      stackTable: newStackTable,
      sampleTable: newSamples,
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
 * @return {object}             The filtered thread.
 */
export function filterThreadToPostfixStack(thread: Thread, postfixFuncs: IndexIntoFuncTable[]) {
  return timeCode('filterThreadToPostfixStack', () => {
    const postfixDepth = postfixFuncs.length;
    const { stackTable, funcTable, sampleTable } = thread;

    function convertStack(leaf) {
      let matchesUpToDepth = 0; // counted from the leaf
      for (let stack = leaf; (stack !== null && stack != -1); stack = stackTable.prefix[stack]) {
        const func = stackTable.func[stack];
        if (func === postfixFuncs[matchesUpToDepth]) {
          matchesUpToDepth++;
          if (matchesUpToDepth === postfixDepth) {
            return stack;
          }
        }

        return null;
      }
      return null;
    }

    const oldStackToNewStack = new Map();
    oldStackToNewStack.set(null, null);
    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(stackIndex => {
        let newStackIndex = oldStackToNewStack.get(stackIndex);
        if (newStackIndex === undefined) {
          newStackIndex = convertStack(stackIndex);
          oldStackToNewStack.set(stackIndex, newStackIndex);
        }
        return newStackIndex;
      }),
    });
    return Object.assign({}, thread, {
      sampleTable: newSamples,
    });
  });
}

export function filterThreadToRange(thread: Thread, usageHoursByDate: UsageHoursByDate,
                                    rangeStart: number, rangeEnd: number) {
  return timeCode('filterThreadToRange', () => {
    const totalUsageHours = objectValues(usageHoursByDate)
      .reduce((sum: number, next: number) => sum + next, 0);

    const { dates, stackTable } = thread;
    let sampleTable = Object.assign({}, thread.sampleTable, {
      sampleHangMs: new Float32Array(thread.sampleTable.length),
      sampleHangCount: new Float32Array(thread.sampleTable.length),
    });

    let newDates = dates.slice(rangeStart, rangeEnd + 1);
    for (let date of newDates) {
      let usageHours = usageHoursByDate[date.date];
      for (let i = 0; i < sampleTable.length; i++) {
        sampleTable.sampleHangMs[i] += date.sampleHangMs[i] * usageHours / totalUsageHours;
        sampleTable.sampleHangCount[i] += date.sampleHangCount[i] * usageHours / totalUsageHours;
      }
    }

    return Object.assign({}, thread, {
      sampleTable,
    });
  });
}

export function getStackFromFuncArray(funcArray: IndexIntoFuncTable[], stackTable: StackTable) {
  return getStackIndexFromFuncPath(funcArray, stackTable);
}

export function getFriendlyThreadName(threads: Thread[], thread: Thread): string {
  return friendlyThreadName(thread.name);
}

export function getStackAsFuncArray(stackIndex: IndexIntoStackTable, stackTable: StackTable): IndexIntoFuncTable[] {
  return getFuncPathFromStackIndex(stackIndex, stackTable);
}

// Returns a list of stack indices from func paths. This function uses a map
// to speed up the look-up process.
export function getStackIndicesFromFuncPaths(
  funcPaths: number[][],
  stackTable: StackTable
): Array<number | null> {
  // This is a Map<string, number>. This map speeds up
  // the look-up process by caching every func path we handle which avoids
  // looking up parents again and again.
  const cache = new Map();
  return funcPaths.map(path =>
    _getStackIndexFromPathWithCache(path, stackTable, cache)
  );
}

// Returns a stack index from a func path, using and contributing to the
// cache parameter.
function _getStackIndexFromPathWithCache(
  funcPath: number[],
  stackTable: StackTable,
  cache: Map<string, number>
): number | null {
  const hashFullPath = hashPath(funcPath);
  const result = cache.get(hashFullPath);
  if (result !== undefined) {
    // The cache already has the result for the full path.
    return result;
  }

  // This array serves as a map and stores the hashes of funcPath's
  // parents to speed up the algorithm. First we'll follow the tree from the
  // bottom towards the top, pushing hashes as we compute them, and then we'll
  // move back towards the bottom popping hashes from this array.
  const sliceHashes = [hashFullPath];

  // Step 1: find whether we already computed the index for one of the path's
  // parents, starting from the closest parent and looping towards the "top" of
  // the tree.
  // If we find it for one of the parents, we'll be able to start at this point
  // in the following look up.
  let i = funcPath.length;
  let index;
  while (--i > 0) {
    // Looking up each parent for this call node, starting from the deepest node.
    // If we find a parent this makes it possible to start the look up from this location.
    const subPath = funcPath.slice(0, i);
    const hash = hashPath(subPath);
    index = cache.get(hash);
    if (index !== undefined) {
      // Yay, we already have the result for a parent!
      break;
    }
    // Cache the hashed value because we'll need it later, after resolving this path.
    // Note we don't add the hash if we found the parent in the cache, so the
    // last added element here will accordingly be the first popped in the next
    // algorithm.
    sliceHashes.push(hash);
  }

  // Step 2: look for the requested path using the call node table, starting at
  // the parent we already know if we found one, and looping down the tree.
  // We're contributing to the cache at the same time.

  // `index` is undefined if no parent was found in the cache. In that case we
  // start from the start, and use `-1` which is the prefix we use to indicate
  // the root node.
  if (index === undefined) {
    index = -1;
  }

  while (i < funcPath.length) {
    // Resolving the index for subpath `funcPath.slice(0, i+1)` given we
    // know the index for the subpath `funcPath.slice(0, i)` (its parent).
    const func = funcPath[i];
    const nextNodeIndex = _getStackIndexFromParentAndFunc(
      index,
      func,
      stackTable
    );

    // We couldn't find this path into the call node table. This shouldn't
    // normally happen.
    if (nextNodeIndex === null) {
      return null;
    }

    // Contributing to the shared cache
    const hash = sliceHashes.pop();
    cache.set(hash, nextNodeIndex);

    index = nextNodeIndex;
    i++;
  }

  return index < 0 ? null : index;
}

// Returns the stack index that matches the function `func` and whose parent's
// stack index is `parent`.
function _getStackIndexFromParentAndFunc(
  parent: number,
  func: IndexIntoFuncTable,
  stackTable: StackTable
): number | null {
  // Node children always come after their parents in the call node table,
  // that's why we start looping at `parent + 1`.
  // Note that because the root parent is `-1`, we correctly start at `0` when
  // we look for a top-level item.
  for (
    let stackIndex = parent + 1; // the root parent is -1
    stackIndex < stackTable.length;
    stackIndex++
  ) {
    if (
      stackTable.prefix[stackIndex] === parent &&
      stackTable.func[stackIndex] === func
    ) {
      return stackIndex;
    }
  }

  return null;
}

// This function returns a stack index from a func path, using the
// specified `stackTable`.
export function getStackIndexFromFuncPath(
  funcPath: number[],
  stackTable: StackTable
): number | null {
  const [result] = getStackIndicesFromFuncPaths([funcPath], stackTable);
  return result;
}

// This function returns a CallNodePath from a stack index.
export function getFuncPathFromStackIndex(
  stackIndex: number | null,
  stackTable: StackTable
): number[] {
  if (stackIndex === null) {
    return [];
  }
  if (stackIndex * 1 !== stackIndex) {
    console.log('bad stackIndex in getFuncPathFromStackIndex:', stackIndex);
    return [];
  }
  const funcPath = [];
  let fs = stackIndex;
  while (fs !== -1) {
    funcPath.push(stackTable.func[fs]);
    fs = stackTable.prefix[fs];
  }
  funcPath.reverse();
  return funcPath;
}

export function invertCallstack(thread: Thread): Thread {
  return timeCode('invertCallstack', () => {
    const { stackTable, funcTable, sampleTable } = thread;

    const newStackTable = {
      length: 0,
      func: [],
      prefix: [],
    };
    // Create a Map that keys off of two values, both the prefix and frame combination
    // by using a bit of math: prefix * funcCount + frame => stackIndex
    const prefixAndFuncToStack = new Map();
    const funcCount = funcTable.length;

    function stackFor(prefix, func) {
      const prefixAndFuncIndex =
        (prefix === null ? -1 : prefix) * funcCount + func;
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
      if (stackIndex === null) {
        return -1;
      }
      let newStack = oldStackToNewStack.get(stackIndex);
      if (newStack === undefined) {
        newStack = -1;
        for (
          let currentStack = stackIndex;
          currentStack !== null && currentStack !== -1;
          currentStack = stackTable.prefix[currentStack]
        ) {
          newStack = stackFor(newStack, stackTable.func[currentStack]);
        }
        oldStackToNewStack.set(stackIndex, newStack);
      }
      return newStack;
    }

    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(oldStack => convertStack(oldStack)),
    });

    return Object.assign({}, thread, {
      sampleTable: newSamples,
      stackTable: newStackTable,
    });
  });
}

export function getEmptyProfile(): Profile {
  return {
    threads: [],
    dates: [],
    usageHoursByDate: {},
    uuid: '',
  };
}
