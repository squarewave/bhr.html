// @flow

import type { UniqueStringArray } from '../../content/unique-string-array';
export type IndexIntoStackTable = number;
export type IndexIntoSsampleTable = number;
export type IndexIntoStringTable = number;
export type IndexIntoFuncTable = number;
export type IndexIntoLibs = number;
export type categoryBitMask = number;
export type resourceTypeEnum = number;
export type MemoryOffset = number;
export type ThreadIndex = number;

/**
 * The stack table is the minimal representation of a call stack. Each stack entry
 * consists of the frame at the top of the stack, and the prefix for the stack that
 * came before it. Stacks can be shared between samples.
 */
export type StackTable = {
  func: number[],
  prefix: number[],
  length: number,
};

export type SampleTable = {
  stack: (number | null)[],
  category: Int32Array,
  runnable: Int32Array,
  sampleHangMs: Float32Array,
  sampleHangCount: Float32Array,
  platform: number[],
  userInteracting: boolean[],
  length: number,
};

export type AllDatesTable = {
  length: number,
  stackHangMs: Float32Array,
  stackHangCount: Float32Array,
  totalStackHangMs: Float32Array,
  totalStackHangCount: Float32Array,
};

export type DateTable = {
  date: string,
  length: number,
  sampleHangMs: Float32Array,
  sampleHangCount: Float32Array,
  totalSampleHangMs: Float32Array,
  totalSampleHangCount: Float32Array,
};

export type Lib = {
  breakpadId: string,
  end: number,
  name: string,
  debugName: string,
  offset: number,
  pdbName: string,
  start: number,
};

/**
 * Multiple frames represent individual invocations of a function, while the FuncTable
 * holds the static information about that function. C++ samples are single memory
 * locations. However, functions span ranges of memory. During symbolication each of
 * these samples are collapsed to point to a single function rather than multiple memory
 * locations.
 */
export type FuncTable = {
  length: number,
  name: IndexIntoStringTable[],
  lib: Array<IndexIntoLibs|-1>,
};

/**
 * Gecko has one or more processes. There can be multiple threads per processes. Each
 * thread has a unique set of tables for its data.
 */
export type Thread = {
  processType: string,
  name: string,
  pid: number | void,
  tid: number | void,
  sampleTable: SampleTable,
  stackTable: StackTable,
  // Strings for profiles are collected into a single table, and are referred to by
  // their index by other tables.
  stringTable: UniqueStringArray,
  libs: Lib[],
  funcTable: FuncTable,
  dates: Array<DateTable>,
  allDates: AllDatesTable,
};

export type UsageHoursByDate = {
  [date: string]: number,
};

/**
 * All of the data for a processed profile.
 */
export type Profile = {
  threads: Thread[],
  dates: string[],
  usageHoursByDate: UsageHoursByDate,
  uuid: string,
};
