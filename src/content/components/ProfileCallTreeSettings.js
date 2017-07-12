import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import actions from '../actions';
import { categoryNames } from '../../common/profile-categories';
import { getInvertCallstack, getSearchString, getCategoryFilter, getRunnableFilter } from '../reducers/url-state';
import IdleSearchField from '../components/IdleSearchField';

import './ProfileCallTreeSettings.css';

class ProfileCallTreeSettings extends Component {
  constructor(props) {
    super(props);
    this._onInvertCallstackClick = this._onInvertCallstackClick.bind(this);
    this._onSearchFieldIdleAfterChange = this._onSearchFieldIdleAfterChange.bind(this);
    this._onCategoryFilterChange = this._onCategoryFilterChange.bind(this);
    this._onRunnableFilterClick = this._onRunnableFilterClick.bind(this);
  }

  _onInvertCallstackClick(e) {
    this.props.changeInvertCallstack(e.target.checked);
  }

  _onRunnableFilterClick(e) {
    this.props.changeRunnableFilter(null);
  }

  _onSearchFieldIdleAfterChange(value) {
    this.props.changeCallTreeSearchString(value);
  }

  _onCategoryFilterChange(e) {
    this.props.changeCategoryFilter(e.target.value);
  }

  render() {
    const { invertCallstack, searchString, categoryFilter, runnableFilter } = this.props;
    return (
      <div className='profileCallTreeSettings'>
        <ul className='profileCallTreeSettingsList'>
          <li className="profileCallTreeSettingsListItem">
            <label className="profileCallTreeSettingsLabel">
              Category:
              <select
                className="profileCallTreeSettingsSelect"
                onChange={this._onCategoryFilterChange}
                value={categoryFilter}
              >
                <option key='all' value=''>All categories</option>
                {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </li>
          <li className='profileCallTreeSettingsListItem'>
            <label className='profileCallTreeSettingsLabel'>
              <input type='checkbox'
                     className='profileCallTreeSettingsCheckbox'
                     onChange={this._onInvertCallstackClick}
                     checked={invertCallstack}/>
              { ' Invert call stack' }
            </label>
          </li>
          {runnableFilter !== null &&
            <li className='profileCallTreeSettingsListItem'>
              <label className='profileCallTreeSettingsLabel'>
                <input type='checkbox'
                       className='profileCallTreeSettingsCheckbox'
                       onChange={this._onRunnableFilterClick}
                       checked={true}/>
                { ` Runnable: ${runnableFilter}` }
              </label>
            </li>
          }
        </ul>
        <div className='profileCallTreeSettingsSearchbar'>
          <label className='profileCallTreeSettingsSearchbarLabel'>
            {'Filter stacks: '}
            <IdleSearchField className='profileCallTreeSettingsSearchField'
                             title='Only display stacks which contain a function whose name matches this substring'
                             idlePeriod={200}
                             defaultValue={searchString}
                             onIdleAfterChange={this._onSearchFieldIdleAfterChange}/>
          </label>
        </div>
      </div>
    );
  }
}

ProfileCallTreeSettings.propTypes = {
  invertCallstack: PropTypes.bool.isRequired,
  changeInvertCallstack: PropTypes.func.isRequired,
  changeCallTreeSearchString: PropTypes.func.isRequired,
  searchString: PropTypes.string.isRequired,
  categoryFilter: PropTypes.string.isRequired,
  runnableFilter: PropTypes.string,
};

export default connect(state => ({
  invertCallstack: getInvertCallstack(state),
  searchString: getSearchString(state),
  categoryFilter: getCategoryFilter(state),
  runnableFilter: getRunnableFilter(state),
}), actions)(ProfileCallTreeSettings);
