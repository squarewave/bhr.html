
export function parseRangeFilters(stringValue = '') {
  if (!stringValue) {
    return [];
  }
  return stringValue.split('~').map(s => {
    const m = s.match(/(-?[0-9.]+)_(-?[0-9.]+)/);
    if (!m) {
      return { start: 0, end: 1000 };
    }
    return { start: parseInt(m[1]), end: parseInt(m[2]) };
  });
}

export function stringifyRangeFilters(arrayValue = []) {
  return arrayValue.map(({ start, end }) => {
    return `${start}_${end}`;
  }).join('~');
}

export function getFormattedTimeLength(length: number) {
  return `${(length).toFixed(0)} days`;
}

export function getRangeFilterLabels(rangeFilters) {
  const labels = rangeFilters.map(range => getFormattedTimeLength(range.end - range.start));
  labels.unshift('Full Range');
  return labels;
}
