// @flow
import type { Milliseconds } from './units';

export type Node = {
  totalTime: string,
  totalTimePercent: string,
  totalCount: string,
  totalCountPercent: string,
  selfTime: string,
  name: string,
  lib: string,
  dim: boolean,
  icon: string | null,
};
