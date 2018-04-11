import { timeCode } from '../common/time-code';

export function buildDateGraph(thread, stack, dateIndex) {
  return timeCode('buildDateGraph', () => {
    const { stackTable, dates, sampleTable } = thread;

    const graph = {
      totalTime: 0,
      totalCount: 0,
    };

    const selfTime = new Float32Array(stackTable.length);
    const totalTime = new Float32Array(stackTable.length);
    const selfCount = new Float32Array(stackTable.length);
    const totalCount = new Float32Array(stackTable.length);

    for (let j = 0; j < sampleTable.length; j++) {
      const stackindex = sampleTable.stack[j];
      if (stackindex !== null) {
        selfTime[stackindex] += dates[dateIndex].sampleHangMs[j];
        selfCount[stackindex] += dates[dateIndex].sampleHangCount[j];
      }
    }

    for (let j = stackTable.length - 1; j >= 0; j--) {
      totalTime[j] += selfTime[j];
      totalCount[j] += selfCount[j];
      if (j === stack) {
        graph.totalTime = totalTime[j];
        graph.totalCount = totalCount[j];
        break;
      }
      const prefix = stackTable.prefix[j];
      if (prefix !== -1) {
        totalTime[prefix] += totalTime[j];
        totalCount[prefix] += totalCount[j];
      } else if (stack === -1) {
        graph.totalTime += totalTime[j];
        graph.totalCount += totalCount[j];
      }
    }

    return graph;
  });
}
