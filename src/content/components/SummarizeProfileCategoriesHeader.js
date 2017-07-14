import React, { Component, PropTypes } from 'react';

class SummarizeProfileCategoriesHeader extends Component {
  render() {
    const { threadName, processType } = this.props;
    return (
      <div>
        <div className='summarize-profile-thread' colSpan='3'>{threadName} Thread, {processType} process</div>
        <div className='summarize-profile-header'>
          <div className='summarize-bar-graph'>
            % Hang time over all dates
          </div>
          <div className='summarize-profile-details'>
            <div className='summarize-profile-text'>Category</div>
            <div className='summarize-profile-numeric'>Mean % hang time</div>
          </div>
        </div>
      </div>
    );
  }
}

SummarizeProfileCategoriesHeader.propTypes = {
  threadName: PropTypes.string.isRequired,
  processType: PropTypes.string.isRequired,
};

export default SummarizeProfileCategoriesHeader;
