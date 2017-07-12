import React, { Component, PropTypes } from 'react';
import SummarizeLineGraph from './SummarizeLineGraph';

class SummarizeProfileExpand extends Component {
  render() {
    const {summary, threadIndex, isExpanded, expand, collapse, expandLength} = this.props;

    const toggle = isExpanded ? collapse : expand;
    // Only show the expand/collapse button when it is warranted.
    if (summary.length > expandLength) {
      return (
        <div className='summarize-profile-row' onClick={() => toggle(threadIndex) }>
          <SummarizeLineGraph isBlank={true} />
          <div className='summarize-profile-details'>
            {
              isExpanded
                ? <a className='summarize-profile-collapse expanded'>Collapse</a>
                : <a className='summarize-profile-collapse'>Expand</a>
            }
          </div>
        </div>
      );
    }
    return null;
  }
}

SummarizeProfileExpand.propTypes = {
  summary: PropTypes.array,
  threadIndex: PropTypes.number.isRequired,
  isExpanded: PropTypes.bool,
  expand: PropTypes.func,
  collapse: PropTypes.func,
  expandLength: PropTypes.number,
};

export default SummarizeProfileExpand;
