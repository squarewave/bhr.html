import { timeCode } from '../common/time-code';

export function buildDateGraph(thread, stack) {
  return timeCode('buildDateGraph', () => {
    const { stackTable, dates, sampleTable } = thread;

    const graph = {
      length: dates.length,
      totalTime: new Float32Array(dates.length),
      totalCount: new Float32Array(dates.length),
    };

    for (let i = 0; i < graph.length; i++) {
      const selfTime = new Float32Array(stackTable.length);
      const totalTime = new Float32Array(stackTable.length);
      const selfCount = new Float32Array(stackTable.length);
      const totalCount = new Float32Array(stackTable.length);

      for (let j = 0; j < sampleTable.length; j++) {
        const stackindex = sampleTable.stack[j];
        if (stackindex !== null) {
          selfTime[stackindex] += dates[i].sampleHangMs[j];
          selfCount[stackindex] += dates[i].sampleHangCount[j];
        }
      }

      for (let j = stackTable.length - 1; j >= 0; j--) {
        totalTime[j] += selfTime[j];
        totalCount[j] += selfCount[j];
        if (j == stack) {
          graph.totalTime[i] = totalTime[j];
          graph.totalCount[i] = totalCount[j];
          break;
        }
        const prefix = stackTable.prefix[j];
        if (prefix !== -1) {
          totalTime[prefix] += totalTime[j];
          totalCount[prefix] += totalCount[j];
        }
      }
    }

    return graph;
  });
}
