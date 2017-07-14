/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { timeCode } from '../common/time-code';
import type { Profile, Thread, IndexIntoStackTable } from '../types/profile';

export type Summary = { [id: string]: number };
type MatchingFunction = (string, string) => boolean;
type StacksInCategory = { [id: string]: { [id: string]: number } };
type SummarySegment = {
  percentage: { [id: string]: number },
};
type RollingSummary = SummarySegment[];
type RunnableDatum = {
  runnable: string | null,
  hangMs: number,
  hangCount: number
};
type Runnables = Array<RunnableDatum>;
type ThreadRunnables = Runnables[];

export function summarizeProfileRunnables(profile: Profile) {
  return timeCode('summarizeProfileRunnables', () => {
    const threadRunnables: ThreadRunnables = getRunnablesForThreadData(profile);
    const rollingSummaries: RollingSummary[] = calculateRollingSummaries(
      profile,
      threadRunnables
    );
    const summaries = summarizeRunnables(profile, threadRunnables);

    return profile.threads.map((thread, i) => ({
      threadIndex: i,
      threadName: thread.name,
      rollingSummary: rollingSummaries[i],
      summary: summaries[i],
    }));
  });
}

/**
 * Count the number of samples in a given runnable. This will also count subrunnables
 * in the case of runnables labeled like "script.link", so "script" and "script.link"
 * will each be counted as having a sample.
 * @param {object} summary - Accumulates the counts.
 * @param {string} fullCategoryName - The name of the runnable.
 * @returns {object} summary
 */
function summarizeSampleRunnables(
  summary: Summary,
  datum: RunnableDatum
): Summary {
  const runnable = datum.runnable || '???';
  if (runnable !== '---') {
    summary[runnable] = (summary[runnable] || 0) + datum.hangMs;
  }
  return summary;
}

/**
 * Finalize the summary calculation by attaching percentages and sorting the result.
 * @param {object} summary - The object that summarizes the times of the samples.
 * @return {array} The summary with percentages.
 */
function calculateSummaryPercentages(summary: Summary) {
  const rows = objectEntries(summary);

  const sampleCount = rows.reduce(
    (sum: number, [name: string, count: number]) => {
      // Only count the sample if it's not a sub-runnable. For instance "script.link"
      // is a sub-runnable of "script".
      return sum + (name.includes('.') ? 0 : count);
    },
    0
  );

  return (
    rows
      .map(([runnable, samples]) => {
        const percentage = samples / sampleCount;
        return { runnable, samples, percentage };
      })
      // Sort by sample count, then by name so that the results are deterministic.
      .sort((a, b) => {
        if (a.samples === b.samples) {
          return a.runnable.localeCompare(b.runnable);
        }
        return b.samples - a.samples;
      })
  );
}

function logStacks(stacksInCategory: StacksInCategory, maxLogLength = 10) {
  const entries = objectEntries(stacksInCategory);
  const data = entries
    .sort(([, { total: a }], [, { total: b }]) => b - a)
    .slice(0, Math.min(maxLogLength, entries.length));

  /* eslint-disable no-console */
  console.log(`Top ${maxLogLength} stacks in selected runnable`);
  console.log(data);
  /* eslint-enable no-console */
}

function stackToString(
  stackIndex: IndexIntoStackTable,
  thread: Thread
): string {
  const { stackTable, frameTable, funcTable, stringTable } = thread;
  const stack = [];
  let nextStackIndex = stackIndex;
  while (nextStackIndex !== -1) {
    const frameIndex = stackTable.frame[nextStackIndex];
    const funcIndex = frameTable.func[frameIndex];
    const name = stringTable._array[funcTable.name[funcIndex]];
    stack.push(name);
    nextStackIndex = stackTable.prefix[nextStackIndex];
  }
  return stack.join('\n');
}

function incrementPerThreadCount(
  container: StacksInCategory,
  key: string,
  threadName: string
) {
  const count = container[key] || { total: 0, [threadName]: 0 };
  count.total++;
  count[threadName]++;
  container[key] = count;
}

/**
 * Take a profile and return a summary that categorizes each sample, then calculate
 * a summary of the percentage of time each sample was present.
 * @param {array} profile - The current profile.
 * @returns {array} Stacks mapped to runnables.
 */
export function getRunnablesForThreadData(profile: Profile): ThreadRunnables {
  return timeCode('getRunnablesForThreadData', () => {
    const threadRunnables = mapProfileToThreadRunnables(profile);
    return threadRunnables;
  });
}

function mapProfileToThreadRunnables(profile: Profile): ThreadRunnables {
  return profile.threads.map(thread => {
    return thread.dates.reduce((memo, next) => memo.concat(
      Array.from(next.sampleHangMs).map((hangMs, i) => ({
        // runnable: thread.stringTable.getString(thread.sampleTable.runnable[i]),
        runnable: thread.sampleTable.runnable[i],
        hangMs,
      }))), []);
  });
}

/**
 * Take a profile and return a summary that categorizes each sample, then calculate
 * a summary of the percentage of time each sample was present.
 * @param {object} profile - The profile to summarize.
 * @param {object} threadRunnables - Each thread's runnables for the samples.
 * @returns {object} The summaries of each thread.
 */
export function summarizeRunnables(
  profile: Profile,
  threadRunnables: ThreadRunnables
) {
  return threadRunnables
    .map(runnables => runnables.reduce(summarizeSampleRunnables, {}))
    .map(calculateSummaryPercentages);
}

export function calculateRollingSummaries(
  profile: Profile,
  threadRunnables: ThreadRunnables,
): RollingSummary[] {
  return profile.threads.map((thread, threadIndex) => {
    const runnables = threadRunnables[threadIndex];
    const rollingSummary: RollingSummary = [];
    let maxKey = null;
    let maxTime = 0;

    for (let i = 0; i < thread.dates.length; i++) {
      const samples: { [string]: number } = {};

      for (let j = 0; j < thread.dates[i].sampleHangMs.length; j++) {
        const runnable = runnables[j].runnable || '???';
        if (runnable !== '---') {
          samples[runnable] = samples[runnable] || 0;
          samples[runnable] += thread.dates[i].sampleHangMs[j];
        }
      }

      for (let [key, time] of Object.entries(samples)) {
        if (time > maxTime) {
          maxKey = key;
          maxTime = time;
        }
      }

      rollingSummary.push({
        samples,
      });
    }

    rollingSummary.forEach(s => {
      s.percentage = mapObj(s.samples, time => time / maxTime);
    });

    return rollingSummary;
  });
}

function mapObj<T>(object: { [string]: T }, fn: (T, string, number) => T) {
  let i = 0;
  const mappedObj = {};
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      i++;
      mappedObj[key] = fn(object[key], key, i);
    }
  }
  return mappedObj;
}

/**
 * Flow requires a type-safe implementation of Object.entries().
 * See: https://github.com/facebook/flow/issues/2174
 */
function objectEntries<T>(object: { [id: string]: T }): Array<[string, T]> {
  const entries = [];
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      entries.push([key, object[key]]);
    }
  }
  return entries;
}
