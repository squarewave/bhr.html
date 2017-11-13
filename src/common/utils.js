// @flow

export function mapObj<T>(object: { [string]: T }, fn: (T, string, number) => T) {
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
export function objectEntries<T>(object: { [id: string]: T }): Array<[string, T]> {
  const entries = [];
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      entries.push([key, object[key]]);
    }
  }

  return entries;
}

/**
 * See above re: Object.entries
 */
export function objectValues<T>(object: { [id: string]: T }): Array<T> {
  const values = [];
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      values.push(object[key]);
    }
  }
  return values;
}


export function friendlyThreadName(threadName: string): string {
  let label;
  switch (threadName) {
    case 'Gecko':
      label = 'Main Thread';
      break;
    case 'Gecko_Child':
      label = 'Content';
      break;
    case 'Gecko_Child_ForcePaint':
      label = 'Content ForcePaint';
      break;
  }

  if (!label) {
    label = threadName;
  }
  return label;
}
