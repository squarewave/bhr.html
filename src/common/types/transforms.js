/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

/**
 * Transforms are the minimal representation some kind of transformation to the data
 * that is used to transform the sample and stack information of a profile. They are
 * applied in a stack.
 *
 * When working with a call tree, nodes in the graph are not stable across various
 * transformations of the stacks. It doesn't make sense to generate a single ID for
 * a node, as the definition of what a node is can change depending on the current
 * context. In order to get around this, we use a combination of the funcPath,
 * implementation, and if the current stacks are inverted to refer to a node in the tree.
 * This combination of information will provide a stable reference to a call node for a
 * given view into a call tree.
 */
import type {
  ThreadIndex,
} from './profile';

/*
 * Define all of the transforms on an object to conveniently access $ObjMap and do
 * nice things like iterate over every transform type. There is no way to create a
 * union from a tuple in flow.
 *
 * See: https://github.com/facebook/flow/issues/961
 */
export type Transform =
  /**
   * FocusSubtree transform represents the operation of focusing on a subtree in a call tree.
   * The subtree is referenced by a funcPath (a list of functions to a particular node),
   * and an implementation filter to filter out certain stacks and nodes that we don't care
   * about. For more details read `docs/call-tree.md`.
   *
   * Here is a typical case of focusing on the subtree at number[] [A, B, C]
   *
   *                     A:3,0                              C:2,0
   *                       |                               /      \
   *                       v       Focus [A, B, C]        v        v
   *                     B:3,0           -->           D:1,0     F:1,0
   *                     /    \                         |           |
   *                    v      v                        v           v
   *                C:2,0     H:1,0                   E:1,1       G:1,1
   *               /      \         \
   *              v        v         v
   *            D:1,0     F:1,0     F:1,1
   *            |           |
   *            v           v
   *          E:1,1       G:1,1
   *
   * As well as focusing on a normal subtree, we can also focus on an inverted call tree.
   * In this case the number[] will be reversed, and will go from the end of a call
   * stack, towards the base, the opposite order of an un-inverted number[].
   *
   * Here is a typical case of focusing on the inverted subtree at number[] [Z, Y, X]
   *
   *           1. Starting call tree         ->       2. Invert call tree        ->
   *
   *                  A:3,0                             Z:2,2         E:1,1
   *                    ↓                                 ↓             ↓
   *                  B:3,0                             Y:2,0         D:1,0
   *                 ↙     ↘                              ↓             ↓
   *             X:1,0     C:1,0                        X:2,0         C:1,0
   *            ↙         ↙      ↘                     ↙     ↘          ↓
   *         Y:1,0     X:1,0     D:1,0             B:1,0     C:1,0    B:1,0
   *           ↓         ↓         ↓                 ↓         ↓        ↓
   *        Z:1,1      Y:1,0     E:1,0             A:1,0     B:1,0    A:1,0
   *                     ↓                                     ↓
   *                   Z:1,1                                  A:1,0
   *
   *  --------------------------------------------------------------------------------
   *
   *   ->    3. Focus [Z, Y, X]      ->      4. Un-invert call tree
   *
   *                 X:2,2                           A:2,0
   *                ↙     ↘                            ↓
   *            B:1,0     C:1,0                      B:2,0
   *              ↓         ↓                       ↙     ↘
   *            A:1,0     B:1,0                 X:1,1     C:1,0
   *                        ↓                               ↓
   *                      A:1,0                           X:1,1
   */
  {|
    +type: 'focus-subtree',
    +funcPath: number[],
    +implementation: string,
    +inverted: boolean,
  |} |

  /**
   * This is the same operation as the FocusSubtree, but it is performed on each usage
   * of the function across the tree, node just the one usage in a call tree.
   *
   *            A:3,0                        X:3,0
   *            /    \                         |
   *           v      v        Focus X         v
   *      X:1,0      B:2,0       ->          Y:3,0
   *        |          |                    /     \
   *        v          v                   v       v
   *      Y:1,0      X:2,0              C:1,1      X:2,0
   *        |          |                             |
   *        v          v                             v
   *      C:1,1      Y:2,0                         Y:2,0
   *                   |                             |
   *                   v                             v
   *                 X:2,0                         D:2,2
   *                   |
   *                   v
   *                 Y:2,0
   *                   |
   *                   v
   *                 D:2,2
   */
  {|
    +type: 'focus-function',
    +funcIndex: number,
  |} |

  /**
   * The MergeCallNode transform represents merging a CallNode into the parent CallNode. The
   * CallNode must match the given number[]. In the call tree below, if the CallNode
   * at path [A, B, C] is removed, then the `D` and `F` CallNodes are re-assigned to `B`.
   * No self time in this case would change, as `C` was not a leaf CallNode, but the
   * structure of the tree was changed slightly. The merging work is done by transforming
   * an existing thread's stackTable.
   *
   *                 A:3,0                              A:3,0
   *                   |                                  |
   *                   v                                  v
   *                 B:3,0        Merge CallNode        B:3,0
   *                 /    \        [A, B, C]         /    |    \
   *                v      v          -->           v     v     v
   *            C:2,0     H:1,0                 D:1,0   F:1,0    H:1,0
   *           /      \         \                 |       |        |
   *          v        v         v                v       v        v
   *        D:1,0     F:1,0     F:1,1          E:1,1    G:1,1    F:1,1
   *        |           |
   *        v           v
   *      E:1,1       G:1,1
   *
   *
   * When a leaf CallNode is merged, the self time for that CallNode is assigned to the
   * parent CallNode. Here the leaf CallNode `E` is merged. `D` goes from having a self
   * time of 0 to 1.
   *                A:3,0                              A:3,0
   *                  |                                  |
   *                  v                                  v
   *                B:3,0        Merge CallNode         B:3,0
   *                /    \      [A, B, C, D, E]        /    \
   *               v      v           -->             v      v
   *           C:2,0     H:1,0                    C:2,0     H:1,0
   *          /      \         \                 /      \         \
   *         v        v         v               v        v         v
   *       D:1,0     F:1,0     F:1,1          D:1,1     F:1,0     F:1,1
   *       |           |                                  |
   *       v           v                                  v
   *     E:1,1       G:1,1                              G:1,1
   *
   * This same operation is not applied to an inverted call stack as it has been deemed
   * not particularly useful, and prone to not give the expected results.
   */
  {|
    +type: 'merge-path-into-caller',
    +funcPath: number[],
    +implementation: string,
  |} |

  /**
   * The MergeFunctions transform is similar to the MergeCallNode, except it merges a single
   * function across the entire call tree, regardless of its location in the tree. It is not
   * depended on any particular number[].
   *
   *                 A:3,0                              A:3,0
   *                   |                                  |
   *                   v                                  v
   *                 B:3,0                              B:3,0
   *                 /    \       Merge Func C       /    |    \
   *                v      v           -->          v     v     v
   *            C:2,0     H:1,0                 D:1,0   F:1,0    H:1,1
   *           /      \         \                 |       |
   *          v        v         v                v       v
   *        D:1,0     F:1,0     C:1,1          E:1,1    G:1,1
   *        |           |
   *        v           v
   *      E:1,1       G:1,1
   */
  {|
    +type: 'merge-function',
    +funcIndex: number,
  |} |

  /**
   * The DropFunction transform removes samples from the thread that have a function
   * somewhere in its stack.
   *
   *                 A:4,0                              A:1,0
   *                 /    \        Drop Func C            |
   *                v      v           -->                v
   *            B:3,0     C:1,0                         B:1,0
   *           /      \                                   |
   *          v        v                                  v
   *        C:2,1     D:1,1                             D:1,1
   *        |
   *        v
   *      D:1,1
   */
  {|
    +type: 'drop-function',
    +funcIndex: number,
  |} |

  /**
   * Collapse lib takes CallNodes that are of a consecutive library, and collapses
   * them into a new collapsed pseudo-stack. Given a call tree like below, where each node
   * is defined by either "function_name" or "function_name:library_name":
   *
   *               A                                   A
   *             /   \                                 |
   *            v     v        Collapse firefox        v
   *    B:firefox    E:firefox       ->             firefox
   *        |            |                         /       \
   *        v            v                        D        F
   *    C:firefox        F
   *        |
   *        v
   *        D
   */
  {|
    +type: 'collapse-lib',
    +libIndex: number,
    // This is the index of the newly created function that represents the collapsed stack.
    +collapsedFuncIndex: number,
    +implementation: string,
  |} |

  /**
   * Collapse direct recursion takes a function that calls itself recursively and collapses
   * it into a single stack.
   *
   *      A                                 A
   *      ↓    Collapse direct recursion    ↓
   *      B          function B             B
   *      ↓              ->                 ↓
   *      B                                 C
   *      ↓
   *      B
   *      ↓
   *      B
   *      ↓
   *      C
   */
  {|
    +type: 'collapse-direct-recursion',
    +funcIndex: number,
    +implementation: string,
  |} |

  /**
   * Collapse the subtree of a function into that function across the entire tree.
   *
   *                  A:4,0                             A:4,0
   *                    |                                 |
   *                    v                                 v
   *                  B:4,0                             B:4,0
   *                  /    \     Collapse subtree C    /     \
   *                 v      v           -->           v       v
   *             C:2,0     H:2,0                    C:2,2     H:2,0
   *            /      \         \                              |
   *           v        v         v                             v
   *         D:1,0     F:1,0     C:2,0                        C:2,2
   *         /          /        /   \
   *        v          v        v     v
   *      E:1,1     G:1,1    I:1,1    J:1,1
   */
  {|
    +type: 'collapse-function-subtree',
    +funcIndex: number,
  |};

export type TransformType = string;
export type TransformStack = Transform[];
export type TransformStacksPerThread = { [id: ThreadIndex]: TransformStack };
