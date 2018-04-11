// @flow

export type DateGraph = {
  totalTime: Float32Array,
  totalCount: Float32Array,
  length: number,
};

export type DateGraphState = {
  dateGraph: DateGraph,
  totalDateGraph: DateGraph,
};

export type CategorySummaryDate = {
  category: string,
  percentage: number,
};

export type CategorySummary = {
  threadIndex: number,
  summary: CategorySummaryDate[],
};
