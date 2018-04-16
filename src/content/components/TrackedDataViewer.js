/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent, PropTypes } from 'react';
import * as colors from 'photon-colors';
import { Line } from 'react-chartjs-2'
import { connect } from 'react-redux';
import type { Action, ThunkAction } from '../actions/types';
import type { TrackedComponent } from '../../common/types/trackedData'
import actions from '../actions';
import { getTrackedData } from '../reducers/tracked-data-view'
import { getTrackedStat } from '../reducers/url-state'
import { objectEntries, friendlyThreadName } from '../../common/utils'

require('./TrackedDataViewer.css');

let categoryColorCache = {};
let nextColorIndex = 0;

// color desaturation logic adapted from https://stackoverflow.com/a/13348458
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
  return {
      r: parseInt(hex.slice(1,3), 16),
      g: parseInt(hex.slice(3,5), 16),
      b: parseInt(hex.slice(5,7), 16)
  };
}

function desaturate(hexColor, saturation) {
  let rgb = hexToRgb(hexColor);
  let gray = rgb.r * 0.3086 + rgb.g * 0.6094 + rgb.b * 0.0820;
  rgb.r = Math.round(rgb.r * saturation + gray * (1 - saturation));
  rgb.g = Math.round(rgb.g * saturation + gray * (1 - saturation));
  rgb.b = Math.round(rgb.b * saturation + gray * (1 - saturation));
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function colorForHangGroup(category, m) {
  if (!categoryColorCache[category]) {
    categoryColorCache[category] = nextColorIndex++;
  }
  let hues = [
    'MAGENTA',
    'PURPLE',
    'BLUE',
    'TEAL',
    'GREEN',
    'YELLOW',
    'RED',
    'ORANGE'
  ];
  let values = [
    50,
    60,
    70,
    80,
    90,
  ];
  let saturations = [
    0.6,
    0.4,
    0.2,
    0.1,
  ];
  let hueIndex = categoryColorCache[category] % hues.length;
  let saturationIndex = Math.floor(categoryColorCache[category] / hues.length);
  let saturated = colors[`${hues[categoryColorCache[category] % hues.length]}_${values[m]}`];
  console.log(saturationIndex);
  return desaturate(saturated, saturations[saturationIndex]);
}

function sumHistogram(hist, startN) {
  return hist.slice(startN).reduce((a, b) => a + b, 0);
}

function movingAverage(items, n) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    if (i == 0) {
      result[i] = items[i] / n;
    } else if (i < n) {
      result[i] = result[i - 1] + items[i] / n;
    } else {
      result[i] = result[i - 1] + items[i] / n - items[i - n] / n;
    }
  }
  return result;
}

let graphOptions = [
  ['useWeeklyAverage', 'Show seven-day average'],
  ['splitByHangDuration', 'Split by hang duration'],
  ['hideLegend', 'Hide legend'],
];

type Props = {
  threadName: string,
  threadData: TrackedComponent,
};

class TrackedDataThreadSection extends PureComponent {
  props: Props;
  state: {
    useWeeklyAverage: boolean,
    splitByHangDuration: boolean,
    hideLegend: boolean,
  };

  constructor(props) {
    super(props);
    this.state = {
      useWeeklyAverage: false,
      splitByHangDuration: false,
      hideLegend: false,
    };
    graphOptions.forEach(([key]) => this.state[key] = false);
  }

  handleInputChange(e) {
    let value = e.target.checked;
    let name = e.target.name;
    this.setState({
      [name]: value
    });
  }

  render() {
    let { threadName, threadData } = this.props;
    let { useWeeklyAverage, splitByHangDuration, hideLegend } = this.state;
    let categories = objectEntries(threadData);
    let dates = new Set();
    for (let [_, data] of categories) {
      for (let [date, _] of objectEntries(data)) {
        dates.add(date);
      }
    }
    dates = Array.from(dates.values());
    dates.sort();

    let start = useWeeklyAverage ? 7 : 0;
    let postProcessData = useWeeklyAverage ? movingAverage : (x => x);

    let getHistogramBucket = (hist, bucket) => {
      return splitByHangDuration ? hist[bucket] : sumHistogram(hist, bucket);
    };

    let getDatasetForBucket = (category, data, label, m) => {
      return {
        label,
        backgroundColor: colorForHangGroup(category, m),
        data: postProcessData(dates.map(date => (date in data) ? getHistogramBucket(data[date], m) : 0),
                              7).slice(start),
      }
    };

    let chartDatasets;
    if (splitByHangDuration) {
      // $FlowFixMe
      chartDatasets = categories.map(([category, data]) => [4,3,2,1,0].map(m => {
        let hangGroup = 128 << m;
        return getDatasetForBucket(category, data, `${category} > ${hangGroup}ms`, m);
      })).reduce((a, b) => a.concat(b), []);
    } else {
      // $FlowFixMe
      chartDatasets = categories.map(([category, data]) => {
        return getDatasetForBucket(category, data, category, 0);
      }).reduce((a, b) => a.concat(b), []);
    }

    let chartLabels = dates.slice(start);
    return (
      <div key={threadName}>
        <h2>{friendlyThreadName(threadName)}</h2>

        {graphOptions.map(([key, label], n) => (
          <label key={n} name={key}>
            <input type="checkbox" name={key} onChange={(e) => this.handleInputChange(e)} />
            {label}
          </label>
        ))}

        <Line data={{labels: chartLabels, datasets: chartDatasets}}
              width={window.innerWidth * 0.8}
              height={300}
              options={{
                maintainAspectRatio: false,
                scales: {
                  yAxes: [{
                    stacked: true,
                    ticks: { beginAtZero: true },
                    scaleLabel: {
                      display: true,
                      labelString: 'Hangs per hour'
                    },
                  }],
                  xAxes: [{
                    scaleLabel: {
                      display: true,
                      labelString: 'Build date'
                    },
                  }],
                },
                responsive: false,
                elements: {point: {radius: 2}},
                legend: {display: !hideLegend},
              }}/>
      </div>
    );
  }

}

class TrackedDataViewer extends PureComponent {
  render() {
    const {
      className,
      trackedData,
      trackedStat,
    } = this.props;

    let trackedStatData = trackedData.find(d => d[0] == trackedStat);
    if (!trackedStatData) {
      return <div className={className}>Unable to find {trackedStat}</div>
    }


    return (
      <div className={className}>
        <a href="/">&lt;&lt; back</a>
        <h1>
          Hang data over time for {trackedStat}
        </h1>
        <div>
          {objectEntries(trackedStatData[1])
            // there's only one data point for WindowsVsyncThread - just ignore
            .filter(([threadName, threadData]) => threadName !== 'WindowsVsyncThread')
            .map(([threadName, threadData]) => (
            <TrackedDataThreadSection key={threadName} threadName={threadName} threadData={threadData} />
          ))}
        </div>
      </div>
    );
  }
}

TrackedDataViewer.propTypes = {
  className: PropTypes.string.isRequired,
  trackedData: PropTypes.array.isRequired,
  trackedStat: PropTypes.string.isRequired,
};

export default connect(state => ({
  className: 'trackedDataViewer',
  trackedData: getTrackedData(state),
  trackedStat: getTrackedStat(state),
}), actions)(TrackedDataViewer);
