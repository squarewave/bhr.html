import React, { Component, PropTypes } from 'react';

class TimeRuler extends Component {

  _findNiceNumberGreaterOrEqualTo(uglyNumber) {
    // Write uglyNumber as a * 10^b, with 1 <= a < 10.
    // Return the lowest of 2 * 10^b, 5 * 10^b, 10 * 10^b that is greater or equal to uglyNumber.
    const b = Math.floor(Math.log10(uglyNumber));
    if (uglyNumber <= 2 * Math.pow(10, b)) {
      return { number: 2 * Math.pow(10, b), exponent: b };
    }
    if (uglyNumber <= 5 * Math.pow(10, b)) {
      return { number: 5 * Math.pow(10, b), exponent: b };
    }
    return { number: Math.pow(10, b + 1), exponent: b + 1 };
  }

  _formatDate(date) {
    let month = date.substr(4, 2).replace(/^0/, '');
    let day = date.substr(6, 2).replace(/^0/, '');
    return `${month}/${day}`;
  }

  _getNotches() {
    if (this.props.width === 0) {
      return [];
    }

    const { zeroAt, rangeStart, rangeEnd, width } = this.props;
    const pixelsPerDay = width / (rangeEnd - rangeStart);
    const minimumNotchWidth = 55; // pixels
    const notchTime = 1;
    const firstNotchIndex = Math.ceil((rangeStart - zeroAt) / notchTime);
    const lastNotchIndex = Math.floor((rangeEnd - zeroAt) / notchTime);
    const notches = [];
    for (let i = firstNotchIndex; i <= lastNotchIndex; i++) {
      let date = this.props.dates[i];
      notches.push({ date, pos: (i * notchTime - (rangeStart - zeroAt)) * pixelsPerDay});
    }
    return notches;
  }

  render() {
    const { className } = this.props;
    const notches = this._getNotches();
    return (<div className={className}>
      <ol className='timeRulerContainer'>
        {
          notches.map(({ date, pos }, i) => (
            <li className='timeRulerNotch' key={i} style={{left: `${pos}px`}}>
              <span className='timeRulerNotchText'>{this._formatDate(date)}</span>
            </li>
          ))
        }
      </ol>
    </div>);
  }

}

TimeRuler.propTypes = {
  className: PropTypes.string.isRequired,
  zeroAt: PropTypes.number.isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  dates: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
};

export default TimeRuler;
