// @flow

export type TrackedComponentHistogram = number[];

export type TrackedComponentCategory = {
  [date: string]: TrackedComponentHistogram,
};

export type TrackedComponentThread = {
  [category: string]: TrackedComponentCategory,
};

export type TrackedComponent = {
  [thread: string]: TrackedComponentThread,
};

export type TrackedDataItem = [string, TrackedComponent];
export type TrackedData = TrackedDataItem[];
