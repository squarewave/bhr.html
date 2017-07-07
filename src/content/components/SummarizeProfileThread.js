import React, { Component, PropTypes } from 'react';
import SummarizeLineGraph from './SummarizeLineGraph';

class SummarizeProfileThread extends Component {
  constructor() {
    super();
    this._onCategoryClicked = this._onCategoryClicked.bind(this);
  }

  _onCategoryClicked() {
    this.props.onSelected(this.props.summaryTable.category);
  }

  render() {
    const {summaryTable, rollingSummary, index} = this.props;
    const {category, samples, percentage} = summaryTable;
    return (
      <div className='summarize-profile-row'>
        <SummarizeLineGraph rollingSummary={rollingSummary} category={category} />
        <div className='summarize-profile-details'>
          <div className='summarize-profile-text' onClick={this._onCategoryClicked}>{category}</div>
          <div className='summarize-profile-numeric'>{displayPercentage(percentage)}</div>
        </div>
      </div>
    );
  }
}

SummarizeProfileThread.propTypes = {
  summaryTable: PropTypes.object,
  rollingSummary: PropTypes.array,
  isExpanded: PropTypes.bool,
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
