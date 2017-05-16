// @flow
import type { Milliseconds } from './units';

export type Node = {
  totalTimePercent: string,
  totalCountPercent: string,
  selfTime: string,
  name: string,
  lib: string,
  dim: boolean,
  icon: string | null,
};
