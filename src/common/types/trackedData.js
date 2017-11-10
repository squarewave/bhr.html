// @flow

export type TrackedCategoryHistogram = number[];

export type TrackedCategoryThread = {
  [date: string]: TrackedCategoryHistogram,
};

export type TrackedCategory = {
  [thread: string]: TrackedCategoryThread,
};

export type TrackedDataItem = [string, TrackedCategory];
export type TrackedData = TrackedDataItem[];
