/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import {
  uintArrayToString,
  stringToUintArray,
} from '../content/uintarray-encoding';
import {
  toValidImplementationFilter,
  getStackFromFuncArray,
} from './profile-data';
import { timeCode } from '../common/time-code';
import { ProfileTree } from '../content/profile-tree';

import type {
  Thread,
  StackTable,
  FuncTable,
} from '../common/types/profile';
import type {
  Transform,
  TransformType,
  TransformStack,
} from '../common/types/transforms';

/**
 * This file contains the functions and logic for working with and applying transforms
 * to profile data.
 */

export function convertToTransformType(type: string): TransformType | null {
  // Coerce this into a TransformType even if it's not one.
  const coercedType = ((type: any): TransformType);
  switch (coercedType) {
    // Exhaustively check each TransformType. The default arm will assert that
    // we have been exhaustive.
    case 'merge-path-into-caller':
    case 'merge-function':
    case 'focus-subtree':
    case 'focus-function':
    case 'collapse-lib':
    case 'collapse-direct-recursion':
    case 'collapse-function-subtree':
    case 'drop-function':
      return coercedType;
    default: {
      return null;
    }
  }
}


// Create mappings from a transform name, to a url-friendly short name.
const TRANSFORM_TO_SHORT_KEY: { [TransformType]: string } = {};
const SHORT_KEY_TO_TRANSFORM: { [string]: TransformType } = {};
[
  'focus-subtree',
  'focus-function',
  'merge-path-into-caller',
  'merge-function',
  'drop-function',
  'collapse-lib',
  'collapse-direct-recursion',
  'collapse-function-subtree',
].forEach((transform: TransformType) => {
  // This is kind of an awkward switch, but it ensures we've exhaustively checked that
  // we have a mapping for every transform.
  let shortKey;
  switch (transform) {
    case 'focus-subtree':
      shortKey = 'f';
      break;
    case 'focus-function':
      shortKey = 'ff';
      break;
    case 'merge-path-into-caller':
      shortKey = 'mcn';
      break;
    case 'merge-function':
      shortKey = 'mf';
      break;
    case 'drop-function':
      shortKey = 'df';
      break;
    case 'collapse-lib':
      shortKey = 'cr';
      break;
    case 'collapse-direct-recursion':
      shortKey = 'rec';
      break;
    case 'collapse-function-subtree':
      shortKey = 'cfs';
      break;
    default: {
      throw new Error("Unexpected transform type");
    }
  }
  TRANSFORM_TO_SHORT_KEY[transform] = shortKey;
  SHORT_KEY_TO_TRANSFORM[shortKey] = transform;
});

/**
 * Map each transform key into a short representation.
 */

/**
 * Every transform is separated by the "~" character.
 * Each transform is made up of a tuple separated by "-"
 * The first value in the tuple is a short key of the transform type.
 *
 * e.g "f-js-xFFpUMl-i" or "f-cpp-0KV4KV5KV61KV7KV8K"
 */
export function parseTransforms(stringValue: string = ''): TransformStack {
  // Flow had some trouble with the `Transform | null` type, so use a forEach
  // rather than a map.
  const transforms = [];

  stringValue.split('~').forEach(s => {
    const tuple = s.split('-');
    const shortKey = tuple[0];
    const type = convertToTransformType(SHORT_KEY_TO_TRANSFORM[shortKey]);
    if (type === null) {
      console.error('Unrecognized transform was passed to the URL.', shortKey);
      return;
    }
    // This switch breaks down each transform into the minimum amount of data needed
    // to represent it in the URL. Each transform has slightly different requirements
    // as defined in src/types/transforms.js.
    switch (type) {
      case 'collapse-lib': {
        // e.g. "cr-js-325-8"
        const [
          ,
          implementation,
          libIndexRaw,
          collapsedFuncIndexRaw,
        ] = tuple;
        const libIndex = parseInt(libIndexRaw, 10);
        const collapsedFuncIndex = parseInt(collapsedFuncIndexRaw, 10);
        if (isNaN(libIndex) || isNaN(collapsedFuncIndex)) {
          break;
        }
        if (libIndex >= 0) {
          transforms.push({
            type,
            libIndex,
            collapsedFuncIndex,
            implementation: toValidImplementationFilter(implementation),
          });
        }

        break;
      }
      case 'collapse-direct-recursion': {
        // e.g. "rec-js-325"
        const [, implementation, funcIndexRaw] = tuple;
        const funcIndex = parseInt(funcIndexRaw, 10);
        if (isNaN(funcIndex) || funcIndex < 0) {
          break;
        }
        transforms.push({
          type,
          funcIndex,
          implementation: toValidImplementationFilter(implementation),
        });
        break;
      }
      case 'merge-function':
      case 'focus-function':
      case 'drop-function':
      case 'collapse-function-subtree': {
        // e.g. "mf-325"
        const [, funcIndexRaw] = tuple;
        const funcIndex = parseInt(funcIndexRaw, 10);
        // Validate that the funcIndex makes sense.
        if (!isNaN(funcIndex) && funcIndex >= 0) {
          switch (type) {
            case 'merge-function':
              transforms.push({
                type: 'merge-function',
                funcIndex,
              });
              break;
            case 'focus-function':
              transforms.push({
                type: 'focus-function',
                funcIndex,
              });
              break;
            case 'drop-function':
              transforms.push({
                type: 'drop-function',
                funcIndex,
              });
              break;
            case 'collapse-function-subtree':
              transforms.push({
                type: 'collapse-function-subtree',
                funcIndex,
              });
              break;
            default:
              throw new Error('Unmatched transform.');
          }
        }
        break;
      }
      case 'focus-subtree':
      case 'merge-path-into-caller': {
        // e.g. "f-js-xFFpUMl-i" or "f-cpp-0KV4KV5KV61KV7KV8K"
        const [
          ,
          implementationRaw,
          serializedFuncPath,
          invertedRaw,
        ] = tuple;
        const implementation = toValidImplementationFilter(implementationRaw);
        const funcPath = stringToUintArray(serializedFuncPath);
        const inverted = Boolean(invertedRaw);
        // Flow requires a switch because it can't deduce the type string correctly.
        switch (type) {
          case 'focus-subtree':
            transforms.push({
              type: 'focus-subtree',
              implementation,
              funcPath,
              inverted,
            });
            break;
          case 'merge-path-into-caller':
            transforms.push({
              type: 'merge-path-into-caller',
              implementation,
              funcPath,
            });
            break;
          default:
            throw new Error('Unmatched transform.');
        }

        break;
      }
      default:
      throw new Error("Unexpected transform type");
    }
  });

  return transforms;
}

export function stringifyTransforms(transforms: TransformStack = []): string {
  return transforms
    .map(transform => {
      const shortKey = TRANSFORM_TO_SHORT_KEY[transform.type];
      if (!shortKey) {
        throw new Error(
          'Expected to be able to convert a transform into its short key.'
        );
      }
      // This switch breaks down each transform into shared groups of what data
      // they need, as defined in src/types/transforms.js. For instance some transforms
      // need only a funcIndex, while some care about the current implemention, or
      // other pieces of data.
      switch (transform.type) {
        case 'merge-function':
        case 'drop-function':
        case 'collapse-function-subtree':
          return `${shortKey}-${transform.funcIndex}`;
        case 'focus-function': {
          let string = `${shortKey}-${transform.funcIndex}`;
          if (transform.inverted) {
            string += '-i';
          }
          return string;
        }
        case 'collapse-lib':
          return `${shortKey}-${transform.implementation}-${
            transform.libIndex
          }-${transform.collapsedFuncIndex}`;
        case 'collapse-direct-recursion':
          return `${shortKey}-${transform.implementation}-${
            transform.funcIndex
          }`;
        case 'focus-subtree':
        case 'merge-path-into-caller': {
          let string = [
            shortKey,
            transform.implementation,
            uintArrayToString(transform.funcPath),
          ].join('-');
          if (transform.inverted) {
            string += '-i';
          }
          return string;
        }
        default:
      throw new Error("Unexpected transform type");
      }
    })
    .join('~');
}

export function getTransformLabels(
  thread: Thread,
  threadName: string,
  transforms: Transform[]
) {
  const { funcTable, libs, stringTable } = thread;
  const labels = transforms.map(transform => {
    // Lookup library information.
    if (transform.type === 'collapse-lib') {
      return `Collapse: ${libs[transform.libIndex].name}`;
    }

    // Lookup function name.
    let funcIndex;
    switch (transform.type) {
      case 'focus-subtree':
      case 'merge-path-into-caller':
        funcIndex = transform.funcPath[transform.funcPath.length - 1];
        break;
      case 'focus-function':
      case 'merge-function':
      case 'drop-function':
      case 'collapse-direct-recursion':
      case 'collapse-function-subtree':
        funcIndex = transform.funcIndex;
        break;
      default:
      throw new Error("Unexpected transform type");
    }
    const nameIndex = funcTable.name[funcIndex];
    const funcName = stringTable.getString(nameIndex);

    switch (transform.type) {
      case 'focus-subtree':
        return `Focus Node: ${funcName}`;
      case 'focus-function':
        return `Focus: ${funcName}`;
      case 'merge-path-into-caller':
        return `Merge Node: ${funcName}`;
      case 'merge-function':
        return `Merge: ${funcName}`;
      case 'drop-function':
        return `Drop: ${funcName}`;
      case 'collapse-direct-recursion':
        return `Collapse recursion: ${funcName}`;
      case 'collapse-function-subtree':
        return `Collapse subtree: ${funcName}`;
      default:
      throw new Error("Unexpected transform type");
    }
  });
  labels.unshift(`Complete "${threadName}"`);
  return labels;
}

export function applyTransformToFuncPath(
  funcPath: number[],
  transform: Transform,
  transformedThread: Thread
): number[] {
  switch (transform.type) {
    case 'focus-subtree':
      return _removePrefixPathFromFuncPath(
        transform.funcPath,
        funcPath
      );
    case 'focus-function':
      return _startFuncPathWithFunction(transform.funcIndex, funcPath);
    case 'merge-path-into-caller':
      return _mergeNodeInFuncPath(transform.funcPath, funcPath);
    case 'merge-function':
      return _mergeFunctionInFuncPath(transform.funcIndex, funcPath);
    case 'drop-function':
      return _dropFunctionInFuncPath(transform.funcIndex, funcPath);
    case 'collapse-lib':
      return _collapseLibInFuncPath(
        transform.libIndex,
        transform.collapsedFuncIndex,
        transformedThread.funcTable,
        funcPath
      );
    case 'collapse-direct-recursion':
      return _collapseDirectRecursionInFuncPath(
        transform.funcIndex,
        funcPath
      );
    case 'collapse-function-subtree':
      return _collapseFunctionSubtreeInFuncPath(
        transform.funcIndex,
        funcPath
      );
    default:
      throw new Error("Unexpected transform type");
  }
}

function _removePrefixPathFromFuncPath(
  prefixPath: number[],
  funcPath: number[]
): number[] {
  return _funcPathHasPrefixPath(prefixPath, funcPath)
    ? funcPath.slice(prefixPath.length - 1)
    : [];
}

function _startFuncPathWithFunction(
  funcIndex: number,
  funcPath: number[]
): number[] {
  const startIndex = funcPath.indexOf(funcIndex);
  return startIndex === -1 ? [] : funcPath.slice(startIndex);
}

function _mergeNodeInFuncPath(
  prefixPath: number[],
  funcPath: number[]
): number[] {
  return _funcPathHasPrefixPath(prefixPath, funcPath)
    ? funcPath.filter((_, i) => i !== prefixPath.length - 1)
    : funcPath;
}

function _mergeFunctionInFuncPath(
  funcIndex: number,
  funcPath: number[]
): number[] {
  return funcPath.filter(nodeFunc => nodeFunc !== funcIndex);
}

function _dropFunctionInFuncPath(
  funcIndex: number,
  funcPath: number[]
): number[] {
  // If the number[] contains the function, return an empty path.
  return funcPath.includes(funcIndex) ? [] : funcPath;
}

function _collapseLibInFuncPath(
  libIndex: number,
  collapsedFuncIndex: number,
  funcTable: FuncTable,
  funcPath: number[]
) {
  return (
    funcPath
      // Map any collapsed functions into the collapsedFuncIndex
      .map(pathFuncIndex => {
        return funcTable.lib[pathFuncIndex] === libIndex
          ? collapsedFuncIndex
          : pathFuncIndex;
      })
      // De-duplicate contiguous collapsed funcs
      .filter(
        (pathFuncIndex, pathIndex, path) =>
          // This function doesn't match the previous one, so keep it.
          pathFuncIndex !== path[pathIndex - 1] ||
          // This function matched the previous, only keep it if doesn't match the
          // collapsed func.
          pathFuncIndex !== collapsedFuncIndex
      )
  );
}

function _collapseDirectRecursionInFuncPath(
  funcIndex: number,
  funcPath: number[]
) {
  const newPath = [];
  let previousFunc;
  for (let i = 0; i < funcPath.length; i++) {
    const pathFunc = funcPath[i];
    if (pathFunc !== funcIndex || pathFunc !== previousFunc) {
      newPath.push(pathFunc);
    }
    previousFunc = pathFunc;
  }
  return newPath;
}

function _collapseFunctionSubtreeInFuncPath(
  funcIndex: number,
  funcPath: number[]
) {
  const index = funcPath.indexOf(funcIndex);
  return index === -1 ? funcPath : funcPath.slice(0, index + 1);
}

function _funcPathHasPrefixPath(
  prefixPath: number[],
  funcPath: number[]
): boolean {
  return (
    prefixPath.length <= funcPath.length &&
    prefixPath.every((prefixFunc, i) => prefixFunc === funcPath[i])
  );
}

/**
 * Take a number[], and invert it given a ProfileTree. Note that if the ProfileTree
 * is itself inverted, you will get back the uninverted number[] to the regular
 * ProfileTree.
 *
 * e.g:
 *   (invertedPath, invertedProfileTree) => path
 *   (path, profileTree) => invertedPath
 *
 * Call trees are sorted with the CallNodes with the heaviest total time as the first
 * entry. This function walks to the tip of the heaviest branches to find the leaf node,
 * then construct an inverted number[] with the result. This gives a pretty decent
 * result, but it doesn't guarantee that it will select the heaviest number[] for the
 * INVERTED call tree. This would require doing a round trip through the reducers or
 * some other mechanism in order to first calculate the next inverted call tree. This is
 * probably not worth it, so go ahead and use the uninverted call tree, as it's probably
 * good enough.
 */
export function invertFuncPath(
  path: number[],
  profileTree: ProfileTree,
  stackTable: StackTable
): number[] {
  let stackIndex = getStackFromFuncArray(path, stackTable);
  if (stackIndex === -1) {
    // No path was found, return an empty number[].
    return [];
  }
  let children = [stackIndex];
  const pathToLeaf = [];
  do {
    // Walk down the tree's depth to construct a path to the leaf node, this should
    // be the heaviest branch of the tree.
    stackIndex = children[0];
    pathToLeaf.push(stackIndex);
    children = profileTree.getChildren(stackIndex);
  } while (children && children.length > 0);

  return (
    pathToLeaf
      // Map the StackIndex to FuncIndex.
      .map(index => stackTable.func[index])
      // Reverse it so that it's in the proper inverted order.
      .reverse()
  );
}

export function postProcessTransforms(thread: Thread) {
  return timeCode('postProcessTransforms', () => {
    const { stackTable, funcTable, sampleTable } = thread;
    const oldStackToNewStack = new Map();
    const funcCount = funcTable.length;
    // Maps can't key off of two items, so combine the prefixCallNode and the funcIndex
    // using the following formula: prefixCallNode * funcCount + funcIndex => callNode
    const prefixCallNodeAndFuncToCallNodeMap = new Map();

    // The callNodeTable components.
    const prefix: Array<number> = [];
    const func: Array<number> = [];
    let length = 0;

    function addCallNode(
      prefixIndex: IndexIntoCallNodeTable,
      funcIndex: IndexIntoFuncTable
    ) {
      const index = length++;
      prefix[index] = prefixIndex;
      func[index] = funcIndex;
    }

    oldStackToNewStack.set(-1, -1);

    // Go through each stack, and create a new callNode table, which is based off of
    // functions rather than frames.
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefixStack = stackTable.prefix[stackIndex];
      // We know that at this point the following condition holds:
      // assert(prefixStack === null || prefixStack < stackIndex);
      const prefixCallNode = oldStackToNewStack.get(prefixStack);
      const funcIndex = stackTable.func[stackIndex];
      const prefixCallNodeAndFuncIndex = prefixCallNode * funcCount + funcIndex;
      let callNodeIndex = prefixCallNodeAndFuncToCallNodeMap.get(
        prefixCallNodeAndFuncIndex
      );
      if (callNodeIndex === undefined) {
        callNodeIndex = length;
        addCallNode(prefixCallNode, funcIndex);
        prefixCallNodeAndFuncToCallNodeMap.set(
          prefixCallNodeAndFuncIndex,
          callNodeIndex
        );
      }
      oldStackToNewStack.set(stackIndex, callNodeIndex);
    }

    const newStacks = {
      prefix: new Int32Array(prefix),
      func: new Int32Array(func),
      length,
    };

    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(oldStack => {
        const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
        if (newStack === undefined) {
          throw new Error(
            'Converting from the old stack to a new stack cannot be undefined'
          );
        }
        return newStack;
      }),
    });
    return Object.assign({}, thread, {
      sampleTable: newSamples,
      stackTable: newStacks,
    });
  });
}

/**
 * Transform a thread's stacks to merge stacks that match the number[] into
 * the calling stack. See `src/types/transforms.js` for more information about the
 * "merge-path-into-caller" transform.
 */
export function mergePathIntoCaller(
  thread: Thread,
  funcPath: number[],
  implementation: string
): Thread {
  return timeCode('mergePathIntoCaller', () => {
    const { stackTable, sampleTable } = thread;
    // Depth here is 0 indexed.
    const depthAtFuncPathLeaf = funcPath.length - 1;
    const oldStackToNewStack: Map<
      number,
      number
    > = new Map();
    // A root stack's prefix will be -1. Maintain that relationship from old to new
    // stacks by mapping from -1 to -1.
    oldStackToNewStack.set(-1, -1);
    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
    };
    // Provide two arrays to efficiently cache values for the algorithm. This probably
    // could be refactored to use only one array here.
    const stackDepths = [];
    const stackMatches = [];
    const funcMatchesImplementation = FUNC_MATCHES[implementation];
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const funcIndex = stackTable.func[stackIndex];

      const doesPrefixMatch = prefix === -1 ? true : stackMatches[prefix];
      const prefixDepth = prefix === -1 ? -1 : stackDepths[prefix];
      const currentFuncOnPath = funcPath[prefixDepth + 1];

      let doMerge = false;
      let stackDepth = prefixDepth;
      let doesMatchFuncPath;
      if (doesPrefixMatch && stackDepth < depthAtFuncPathLeaf) {
        // This stack's prefixes were in our number[].
        if (currentFuncOnPath === funcIndex) {
          // This stack's function matches too!
          doesMatchFuncPath = true;
          if (stackDepth + 1 === depthAtFuncPathLeaf) {
            // Holy cow, we found a match for our merge operation and can merge this stack.
            doMerge = true;
          } else {
            // Since we found a match, increase the stack depth. This should match
            // the depth of the implementation filtered stacks.
            stackDepth++;
          }
        } else if (!funcMatchesImplementation(thread, funcIndex)) {
          // This stack's function does not match the number[], however it's not part
          // of the number[]'s implementation filter. Go ahead and keep it.
          doesMatchFuncPath = true;
        } else {
          // While all of the predecessors matched, this stack's function does not :(
          doesMatchFuncPath = false;
        }
      } else {
        // This stack is not part of a matching branch of the tree.
        doesMatchFuncPath = false;
      }
      stackMatches[stackIndex] = doesMatchFuncPath;
      stackDepths[stackIndex] = stackDepth;

      // Map the oldStackToNewStack, and only push on the stacks that aren't merged.
      if (doMerge) {
        const newStackPrefix = oldStackToNewStack.get(prefix);
        oldStackToNewStack.set(
          stackIndex,
          newStackPrefix === undefined ? -1 : newStackPrefix
        );
      } else {
        const newStackIndex = newStackTable.length++;
        const newStackPrefix = oldStackToNewStack.get(prefix);
        newStackTable.prefix[newStackIndex] =
          newStackPrefix === undefined ? -1 : newStackPrefix;
        newStackTable.func[newStackIndex] = funcIndex;
        oldStackToNewStack.set(stackIndex, newStackIndex);
      }
    }
    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(oldStack => {
        const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
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
 * Go through the StackTable and remove any stacks that are part of the given function.
 * This operation effectively merges the timing of the stacks into their callers.
 */
export function mergeFunction(
  thread: Thread,
  funcIndexToMerge: number
) {
  const { stackTable, sampleTable } = thread;
  const oldStackToNewStack: Map<number, number> = new Map();
  // A root stack's prefix will be null. Maintain that relationship from old to new
  // stacks by mapping from null to null.
  oldStackToNewStack.set(-1, -1);
  const newStackTable = {
    length: 0,
    prefix: [],
    func: [],
  };
  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    const funcIndex = stackTable.func[stackIndex];

    if (funcIndex === funcIndexToMerge) {
      const newStackPrefix = oldStackToNewStack.get(prefix);
      oldStackToNewStack.set(
        stackIndex,
        newStackPrefix === undefined ? -1 : newStackPrefix
      );
    } else {
      const newStackIndex = newStackTable.length++;
      const newStackPrefix = oldStackToNewStack.get(prefix);
      newStackTable.prefix[newStackIndex] =
        newStackPrefix === undefined ? -1 : newStackPrefix;
      newStackTable.func[newStackIndex] = funcIndex;
      oldStackToNewStack.set(stackIndex, newStackIndex);
    }
  }
  const newSamples = Object.assign({}, sampleTable, {
    stack: sampleTable.stack.map(oldStack => {
      const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
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
}

/**
 * Drop any samples that contain the given function.
 */
export function dropFunction(
  thread: Thread,
  funcIndexToDrop: number
) {
  const { stackTable, sampleTable } = thread;

  // Go through each stack, and label it as containing the function or not.
  const stackContainsFunc: Array<void | true> = [];
  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    const funcIndex = stackTable.func[stackIndex];
    if (
      // This is the function we want to remove.
      funcIndex === funcIndexToDrop ||
      // The parent of this stack contained the function.
      (prefix !== -1 && stackContainsFunc[prefix])
    ) {
      stackContainsFunc[stackIndex] = true;
    }
  }

  // Regenerate the stacks for the samples table.
  const stack = sampleTable.stack.map(
    stack => (stack !== null && stackContainsFunc[stack] ? null : stack)
  );

  // Return the thread with the replaced samples.
  return Object.assign({}, thread, {
    sampleTable: Object.assign({}, sampleTable, { stack }),
  });
}

export function collapseLib(
  thread: Thread,
  libIndexToCollapse: number,
  implementation: string
): Thread {
  const { stackTable, funcTable, libs, sampleTable, stringTable } = thread;
  const libNameIndex = stringTable.indexForString(libs[libIndexToCollapse].name);
  const newFuncTable: FuncTable = {
    name: funcTable.name.slice(),
    lib: funcTable.lib.slice(),
    length: funcTable.length,
  };
  const newStackTable: StackTable = {
    length: 0,
    prefix: [],
    func: [],
  };
  const oldStackToNewStack: Map<
    number,
    number
  > = new Map();
  const prefixStackToCollapsedStack: Map<
    number, // prefix stack index
    number // collapsed stack index
  > = new Map();
  const collapsedStacks: Set<number> = new Set();
  const funcMatchesImplementation = FUNC_MATCHES[implementation];

  // A root stack's prefix will be -1. Maintain that relationship from old to new
  // stacks by mapping from -1 to -1.
  oldStackToNewStack.set(-1, -1);
  // A new func will be created on the first stack that is found that includes
  // the given lib.
  let collapsedFuncIndex;

  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    const funcIndex = stackTable.func[stackIndex];
    const libIndex = funcTable.lib[funcIndex];
    const newStackPrefix = oldStackToNewStack.get(prefix);

    if (newStackPrefix === undefined) {
      throw new Error('newStackPrefix must not be undefined');
    }
    if (libIndex === libIndexToCollapse) {
      // The stack matches this lib.
      if (!collapsedStacks.has(newStackPrefix)) {
        // The prefix is not a collapsed stack. So this stack will not collapse into its
        // prefix stack. But it might collapse into a sibling stack, if there exists a
        // sibling with the same lib. Check if a collapsed stack with the same
        // prefix (i.e. a collapsed sibling) exists.

        const existingCollapsedStack = prefixStackToCollapsedStack.get(prefix);
        if (existingCollapsedStack === undefined) {
          // Compute the next indexes
          const newStackIndex = newStackTable.length++;
          collapsedStacks.add(newStackIndex);
          oldStackToNewStack.set(stackIndex, newStackIndex);
          prefixStackToCollapsedStack.set(prefix, newStackIndex);

          if (collapsedFuncIndex === undefined) {
            collapsedFuncIndex = newFuncTable.length++;

            // Add the psuedo-func
            newFuncTable.name.push(libNameIndex);
            newFuncTable.lib.push(funcTable.lib[funcIndex]);
          }

          // Add the new stack.
          newStackTable.prefix.push(newStackPrefix);
          newStackTable.func.push(collapsedFuncIndex);
        } else {
          // A collapsed stack at this level already exists, use that one.
          if (existingCollapsedStack === -1) {
            throw new Error('existingCollapsedStack cannot be -1');
          }
          oldStackToNewStack.set(stackIndex, existingCollapsedStack);
        }
      } else {
        // The prefix was already collapsed, use that one.
        oldStackToNewStack.set(stackIndex, newStackPrefix);
      }
    } else {
      if (
        !funcMatchesImplementation(thread, funcIndex) &&
        newStackPrefix !== -1
      ) {
        // This function doesn't match the implementation filter.
        const prefixFunc = newStackTable.func[newStackPrefix];
        const prefixLib = newFuncTable.lib[prefixFunc];

        if (prefixLib === libIndexToCollapse) {
          // This stack's prefix did match the collapsed lib, map the stack
          // to the already collapsed stack and move on.
          oldStackToNewStack.set(stackIndex, newStackPrefix);
          continue;
        }
      }
      // This stack isn't part of the collapsed lib. Copy over the previous stack.
      const newStackIndex = newStackTable.length++;
      newStackTable.prefix.push(newStackPrefix);
      newStackTable.func.push(funcIndex);
      oldStackToNewStack.set(stackIndex, newStackIndex);
    }
  }

  const newSamples = Object.assign({}, sampleTable, {
    stack: sampleTable.stack.map(oldStack => {
      const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
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
    funcTable: newFuncTable,
    sampleTable: newSamples,
  });
}

export function collapseDirectRecursion(
  thread: Thread,
  funcToCollapse: number,
  implementation: string
): Thread {
  const { stackTable, sampleTable } = thread;
  const oldStackToNewStack: Map<
    number,
    number
  > = new Map();
  // A root stack's prefix will be -1. Maintain that relationship from old to new
  // stacks by mapping from -1 to -1.
  oldStackToNewStack.set(-1, -1);
  const recursiveStacks = new Set();
  const newStackTable = {
    length: 0,
    prefix: [],
    func: [],
  };
  const funcMatchesImplementation = FUNC_MATCHES[implementation];

  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    const funcIndex = stackTable.func[stackIndex];

    if (
      // The previous stacks were collapsed or matched the funcToCollapse, check to see
      // if this is a candidate for collapsing as well.
      recursiveStacks.has(prefix) &&
      // Either the function must match, or the implementation must be different.
      (funcToCollapse === funcIndex ||
        !funcMatchesImplementation(thread, funcIndex))
    ) {
      // Out of N consecutive stacks that match the function to collapse, only remove
      // stacks that are N > 1.
      const newPrefixStackIndex = oldStackToNewStack.get(prefix);
      if (newPrefixStackIndex === undefined) {
        throw new Error('newPrefixStackIndex cannot be undefined');
      }
      oldStackToNewStack.set(stackIndex, newPrefixStackIndex);
      recursiveStacks.add(stackIndex);
    } else {
      // Add a stack in two cases:
      //   1. It doesn't match the collapse requirements.
      //   2. It is the first instance of a stack to collapse, re-use the stack and frame
      //      information for the collapsed stack.
      const newStackIndex = newStackTable.length++;
      const newStackPrefix = oldStackToNewStack.get(prefix);
      if (newStackPrefix === undefined) {
        throw new Error(
          'The newStackPrefix must exist because prefix < stackIndex as the StackTable is ordered.'
        );
      }
      newStackTable.prefix[newStackIndex] = newStackPrefix;
      newStackTable.func[newStackIndex] = funcIndex;
      oldStackToNewStack.set(stackIndex, newStackIndex);

      if (funcToCollapse === funcIndex) {
        recursiveStacks.add(stackIndex);
      }
    }
  }
  const newSamples = Object.assign({}, sampleTable, {
    stack: sampleTable.stack.map(oldStack => {
      const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
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
}
const FUNC_MATCHES = {
  combined: (_thread: Thread, _funcIndex: number) => true,
  cpp: (thread: Thread, funcIndex: number): boolean => {
    const { funcTable, stringTable } = thread;

    // Regular C++ functions are associated with a resource that describes the
    // shared library that these C++ functions were loaded from. Jitcode is not
    // loaded from shared libraries but instead generated at runtime, so Jitcode
    // frames are not associated with a shared library and thus have no resource
    const locationString = stringTable.getString(funcTable.name[funcIndex]);
    if (locationString.includes(".js")) {
      return false;
    }
    const isProbablyJitCode =
      funcTable.lib[funcIndex] === -1; // TODO
    return !isProbablyJitCode;
  },
  js: (thread: Thread, funcIndex: number): boolean => {
    const { funcTable, stringTable } = thread;
    const locationString = stringTable.getString(funcTable.name[funcIndex]);
    return locationString.includes(".js");
  },
};

export function collapseFunctionSubtree(
  thread: Thread,
  funcToCollapse: number
): Thread {
  const { stackTable, sampleTable } = thread;
  const oldStackToNewStack: Map<
    number,
    number
  > = new Map();
  // A root stack's prefix will be -1. Maintain that relationship from old to new
  // stacks by mapping from -1 to -1.
  oldStackToNewStack.set(-1, -1);
  const collapsedStacks = new Set();
  const newStackTable = {
    length: 0,
    prefix: [],
    func: [],
  };

  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    if (
      // The previous stack was collapsed, this one is collapsed too.
      collapsedStacks.has(prefix)
    ) {
      // Only remember that this stack is collapsed.
      const newPrefixStackIndex = oldStackToNewStack.get(prefix);
      if (newPrefixStackIndex === undefined) {
        throw new Error('newPrefixStackIndex cannot be undefined');
      }
      // Many collapsed stacks will potentially all point to the first stack that used the
      // funcToCollapse, so newPrefixStackIndex will potentially be assigned to many
      // stacks. This is what actually "collapses" a stack.
      oldStackToNewStack.set(stackIndex, newPrefixStackIndex);
      collapsedStacks.add(stackIndex);
    } else {
      // Add this stack.
      const newStackIndex = newStackTable.length++;
      const newStackPrefix = oldStackToNewStack.get(prefix);
      if (newStackPrefix === undefined) {
        throw new Error(
          'The newStackPrefix must exist because prefix < stackIndex as the StackTable is ordered.'
        );
      }

      const funcIndex = stackTable.func[stackIndex];
      newStackTable.prefix[newStackIndex] = newStackPrefix;
      newStackTable.func[newStackIndex] = funcIndex;
      oldStackToNewStack.set(stackIndex, newStackIndex);

      // If this is the function to collapse, keep the stack, but note that its children
      // should be discarded.
      if (funcToCollapse === funcIndex) {
        collapsedStacks.add(stackIndex);
      }
    }
  }
  const newSamples = Object.assign({}, sampleTable, {
    stack: sampleTable.stack.map(oldStack => {
      const newStack = oldStack === null ? null : oldStackToNewStack.get(oldStack);
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
}

/**
 * Filter thread to only contain stacks which start with a number[], and
 * only samples with those stacks. The new stacks' roots will be frames whose
 * func is the last element of the prefix number[].
 */
export function focusSubtree(
  thread: Thread,
  funcPath: number[],
  implementation: string
): Thread {
  return timeCode('focusSubtree', () => {
    const { stackTable, sampleTable } = thread;
    const prefixDepth = funcPath.length;
    const stackMatches = new Int32Array(stackTable.length);
    const funcMatchesImplementation = FUNC_MATCHES[implementation];
    const oldStackToNewStack: Map<
      number,
      number
    > = new Map();
    // A root stack's prefix will be -1. Maintain that relationship from old to new
    // stacks by mapping from -1 to -1.
    oldStackToNewStack.set(-1, -1);
    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
    };
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const prefixMatchesUpTo = prefix !== -1 ? stackMatches[prefix] : 0;
      let stackMatchesUpTo = -1;
      if (prefixMatchesUpTo !== -1) {
        const funcIndex = stackTable.func[stackIndex];
        if (prefixMatchesUpTo === prefixDepth) {
          stackMatchesUpTo = prefixDepth;
        } else {
          if (funcIndex === funcPath[prefixMatchesUpTo]) {
            stackMatchesUpTo = prefixMatchesUpTo + 1;
          } else if (!funcMatchesImplementation(thread, funcIndex)) {
            stackMatchesUpTo = prefixMatchesUpTo;
          }
        }
        if (stackMatchesUpTo === prefixDepth) {
          const newStackIndex = newStackTable.length++;
          const newStackPrefix = oldStackToNewStack.get(prefix);
          newStackTable.prefix[newStackIndex] =
            newStackPrefix !== undefined ? newStackPrefix : -1;
          newStackTable.func[newStackIndex] = funcIndex;
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
 * Filter thread to only contain stacks which end with a number[], and
 * only samples with those stacks. The new stacks' leaf frames will be
 * frames whose func is the last element of the postfix func array.
 */
export function focusInvertedSubtree(
  thread: Thread,
  postfixFuncPath: number[],
  implementation: string
): Thread {
  return timeCode('focusInvertedSubtree', () => {
    const postfixDepth = postfixFuncPath.length;
    const { stackTable, sampleTable } = thread;
    const funcMatchesImplementation = FUNC_MATCHES[implementation];
    function convertStack(leaf) {
      let matchesUpToDepth = 0; // counted from the leaf
      for (let stack = leaf; stack !== null; stack = stackTable.prefix[stack]) {
        const funcIndex = stackTable.func[stack];
        if (funcIndex === postfixFuncPath[matchesUpToDepth]) {
          matchesUpToDepth++;
          if (matchesUpToDepth === postfixDepth) {
            return stack;
          }
        } else if (funcMatchesImplementation(thread, funcIndex)) {
          return null;
        }
      }
      return null;
    }

    const oldStackToNewStack = new Map();
    // A root stack's prefix will be null. Maintain that relationship from old to new
    // stacks by mapping from null to null.
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
export function focusFunction(
  thread: Thread,
  funcIndexToFocus: number
): Thread {
  return timeCode('focusSubtree', () => {
    const { stackTable, sampleTable } = thread;
    const oldStackToNewStack: Map<
      number,
      number
    > = new Map();
    // A root stack's prefix will be -1. Maintain that relationship from old to new
    // stacks by mapping from -1 to -1.
    oldStackToNewStack.set(-1, -1);
    const newStackTable = {
      length: 0,
      prefix: [],
      func: [],
    };
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefix = stackTable.prefix[stackIndex];
      const funcIndex = stackTable.func[stackIndex];
      const matchesFocusFunc = funcIndex === funcIndexToFocus;

      const newPrefix = oldStackToNewStack.get(prefix);
      if (newPrefix === undefined) {
        throw new Error('The prefix should not map to an undefined value');
      }

      if (newPrefix !== -1 || matchesFocusFunc) {
        const newStackIndex = newStackTable.length++;
        newStackTable.prefix[newStackIndex] = newPrefix;
        newStackTable.func[newStackIndex] = funcIndex;
        oldStackToNewStack.set(stackIndex, newStackIndex);
      } else {
        oldStackToNewStack.set(stackIndex, -1);
      }
    }
    const newSamples = Object.assign({}, sampleTable, {
      stack: sampleTable.stack.map(oldStack => {
        if (oldStack === null) {
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
 * When restoring function in a number[] there can be multiple correct FuncPaths
 * that could be restored. The best approach would probably be to restore to the
 * "heaviest" callstack in the call tree (i.e. the one that is displayed first in the
 * calltree because it has the most samples under it.) This function only finds the first
 * match and returns it.
 */
export function restoreAllFunctionsInFuncPath(
  thread: Thread,
  previousImplementationFilter: string,
  funcPath: number[]
): number[] {
  const { stackTable } = thread;
  const funcMatchesImplementation = FUNC_MATCHES[previousImplementationFilter];
  // For every stackIndex, matchesUpToDepth[stackIndex] will be:
  //  - null if stackIndex does not match the funcPath
  //  - <depth> if stackIndex matches funcPath up to (and including) funcPath[<depth>]
  const matchesUpToDepth = [];
  let tipStackIndex = -1;
  // Try to find the tip most stackIndex in the number[], but skip anything
  // that doesn't match the previous implementation filter.
  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const prefix = stackTable.prefix[stackIndex];
    const funcIndex = stackTable.func[stackIndex];
    const prefixPathDepth = prefix === null ? -1 : matchesUpToDepth[prefix];

    if (prefixPathDepth === null) {
      continue;
    }

    const pathDepth = prefixPathDepth + 1;
    const nextPathFuncIndex = funcPath[pathDepth];
    if (nextPathFuncIndex === funcIndex) {
      // This function is a match.
      matchesUpToDepth[stackIndex] = pathDepth;
      if (pathDepth === funcPath.length - 1) {
        // The tip of the number[] has been found.
        tipStackIndex = stackIndex;
        break;
      }
    } else if (!funcMatchesImplementation(thread, funcIndex)) {
      // This function didn't match, but it also wasn't in the previous implementation.
      // Keep on searching for a match.
      matchesUpToDepth[stackIndex] = prefixPathDepth;
    } else {
      matchesUpToDepth[stackIndex] = null;
    }
  }

  // Turn the stack index into a number[]
  if (tipStackIndex === -1) {
    return [];
  }
  const newFuncPath = [];
  for (
    let stackIndex = tipStackIndex;
    stackIndex !== -1;
    stackIndex = stackTable.prefix[stackIndex]
  ) {
    const funcIndex = stackTable.func[stackIndex];
    newFuncPath.push(funcIndex);
  }
  return newFuncPath.reverse();
}

export function getStackType(
  thread: Thread,
  funcIndex: number
): string {
  if (FUNC_MATCHES.cpp(thread, funcIndex)) {
    return 'native';
  } else if (FUNC_MATCHES.js(thread, funcIndex)) {
    return 'js';
  }
  return 'unsymbolicated';
}

export function filterFuncPathByImplementation(
  thread: Thread,
  implementationFilter: string,
  funcPath: number[]
): number[] {
  const funcMatchesImplementation = FUNC_MATCHES[implementationFilter];
  return funcPath.filter(funcIndex =>
    funcMatchesImplementation(thread, funcIndex)
  );
}

/**
 * Search through the entire call stack and see if there are any examples of
 * recursion.
 */
export function funcHasRecursiveCall(
  thread: Thread,
  implementation: string,
  funcToCheck: number
) {
  const { stackTable } = thread;
  const recursiveStacks = new Set();
  const funcMatchesImplementation = FUNC_MATCHES[implementation];

  for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
    const funcIndex = stackTable.func[stackIndex];
    const prefix = stackTable.prefix[stackIndex];
    const recursivePrefix = recursiveStacks.has(prefix);

    if (funcToCheck === funcIndex) {
      if (recursivePrefix) {
        // This function matches and so did its prefix of the same implementation.
        return true;
      }
      recursiveStacks.add(stackIndex);
    } else {
      if (recursivePrefix && !funcMatchesImplementation(thread, funcIndex)) {
        recursiveStacks.add(stackIndex);
      }
    }
  }
  return false;
}
