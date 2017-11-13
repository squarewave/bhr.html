/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent, PropTypes } from 'react';
import * as colors from 'photon-colors';
import { Line } from 'react-chartjs-2'
import { connect } from 'react-redux';
import type { Action, ThunkAction } from '../actions/types';
import type { TrackedData } from '../../common/types/trackedData'
import actions from '../actions';
import { getTrackedData } from '../reducers/tracked-data-view'
import { getTrackedStat } from '../reducers/url-state'
import { objectEntries, friendlyThreadName } from '../../common/utils'

require('./TrackedDataViewer.css');

type Props = {
  className: string,
  trackedStat: string,
  trackedData: TrackedData,
};

function colorForHangGroup(n) {
  return ([
    colors.BLUE_40,
    colors.BLUE_50,
    colors.BLUE_60,
    colors.BLUE_70,
    colors.BLUE_80,
    colors.BLUE_90,
  ])[n];
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

class TrackedDataViewer extends PureComponent {
  props: Props;
  state: {
    useWeeklyAverage: boolean,
  };

  constructor(props) {
    super(props);
    this.state = { useWeeklyAverage: false };
  }

  handleInputChange(e) {
    let value = e.target.checked;
    let name = e.target.name;
    this.setState({
      [name]: value
    });
  }

  _getThreadChart(threadName, threadData) {
    let { useWeeklyAverage } = this.state;
    let entries = objectEntries(threadData);
    entries.sort(([ka,va], [kb,vb]) => ka.localeCompare(kb));
    let start = useWeeklyAverage ? 7 : 0;
    let postProcessData = useWeeklyAverage ? movingAverage : (x => x);
    let chartDatasets = [5,4,3,2,1,0].map(n => {
      let hangGroup = 128 << n;
      return {
        label: `> ${hangGroup}ms`,
        backgroundColor: colorForHangGroup(n),
        data: postProcessData(entries.map(([date, hist]) => sumHistogram(hist, n)), 7).slice(start),
      }
    });
    let chartLabels = entries.map(([date, hist]) => date).slice(start);
    return (
      <div key={threadName}>
        <h2>{friendlyThreadName(threadName)}</h2>
        <Line data={{labels: chartLabels, datasets: chartDatasets}}
              width={1000}
              height={300}
              options={{
                maintainAspectRatio: false,
                scales: {
                  yAxes: [{
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
              }}/>
      </div>
    );
  }

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
        <label name="useWeeklyAverage">
          <input type="checkbox" name="useWeeklyAverage" onChange={(e) => this.handleInputChange(e)} />
          Show seven-day average
        </label>
        <div>
          {objectEntries(trackedStatData[1]).map(([threadName, threadData]) => (
            this._getThreadChart(threadName, threadData)
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
