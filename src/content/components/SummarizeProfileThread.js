import React, { Component, PropTypes } from 'react';
import SummarizeLineGraph from './SummarizeLineGraph';

class SummarizeProfileThread extends Component {
  constructor() {
    super();
    this._onRowClicked = this._onRowClicked.bind(this);
  }

  _onRowClicked() {
    this.props.onSelected(this.props.row.name);
  }

  render() {
    const {row, rollingSummary, index} = this.props;
    const {name, percentage} = row;
    return (
      <div className='summarize-profile-row' onClick={this._onRowClicked}>
        <SummarizeLineGraph rollingSummary={rollingSummary} name={name} />
        <div className='summarize-profile-details'>
          <div className='summarize-profile-text'>{name}</div>
          <div className='summarize-profile-numeric'>{displayPercentage(percentage)}</div>
        </div>
      </div>
    );
  }
}

SummarizeProfileThread.propTypes = {
  row: PropTypes.object,
  rollingSummary: PropTypes.array,
  index: PropTypes.number,
  onSelected: PropTypes.func,
};

export default SummarizeProfileThread;
/**
 * Format a percentage for display, e.g. 0.1344844543 => "13.45%".
 * @param {number} n - The number.
 * @returns {string} The formatted string.
 */
function displayPercentage(n) {
  const percentage = Math.round(n * 1000);
  const integer = Math.floor(percentage / 10);
  const decimal = Math.floor(percentage - integer * 10);
  return `${integer}.${decimal}`;
}
