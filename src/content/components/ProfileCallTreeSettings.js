import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import actions from '../actions';
import { categoryNames } from '../../common/profile-categories';
import { selectedThreadSelectors } from '../reducers/profile-view';
import {
  getInvertCallstack,
  getSearchString,
  getCategoryFilter,
  getPlatformFilter,
  getRunnableFilter,
  getOnlyUserInteracting
} from '../reducers/url-state';
import IdleSearchField from '../components/IdleSearchField';

import './ProfileCallTreeSettings.css';

class ProfileCallTreeSettings extends Component {
  constructor(props) {
    super(props);
    this._onInvertCallstackClick = this._onInvertCallstackClick.bind(this);
    this._onOnlyUserInteractingClick = this._onOnlyUserInteractingClick.bind(this);
    this._onSearchFieldIdleAfterChange = this._onSearchFieldIdleAfterChange.bind(this);
    this._onCategoryFilterChange = this._onCategoryFilterChange.bind(this);
    this._onPlatformFilterChange = this._onPlatformFilterChange.bind(this);
    this._onRunnableFilterClick = this._onRunnableFilterClick.bind(this);
  }

  _onInvertCallstackClick(e) {
    this.props.changeInvertCallstack(e.target.checked);
  }

  _onOnlyUserInteractingClick(e) {
    this.props.changeOnlyUserInteracting(e.target.checked);
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

  _onPlatformFilterChange(e) {
    this.props.changePlatformFilter(e.target.value);
  }

  render() {
    const {
      invertCallstack,
      searchString,
      categoryFilter,
      platformFilter,
      runnableFilter,
      onlyUserInteracting,
      platforms,
    } = this.props;
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
          <li className="profileCallTreeSettingsListItem">
            <label className="profileCallTreeSettingsLabel">
              Platform:
              <select
                className="profileCallTreeSettingsSelect"
                onChange={this._onPlatformFilterChange}
                value={platformFilter}
              >
                <option key='all' value=''>All platforms</option>
                {platforms.map(c => <option key={c} value={c}>{c}</option>)}
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
          <li className='profileCallTreeSettingsListItem'>
            <label className='profileCallTreeSettingsLabel'>
              <input type='checkbox'
                     className='profileCallTreeSettingsCheckbox'
                     onChange={this._onOnlyUserInteractingClick}
                     checked={onlyUserInteracting}/>
              { ' Only hangs where user was interacting' }
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
  onlyUserInteracting: PropTypes.bool.isRequired,
  changeInvertCallstack: PropTypes.func.isRequired,
  changeOnlyUserInteracting: PropTypes.func.isRequired,
  changeCallTreeSearchString: PropTypes.func.isRequired,
  changePlatformFilter: PropTypes.func.isRequired,
  searchString: PropTypes.string.isRequired,
  categoryFilter: PropTypes.string.isRequired,
  platformFilter: PropTypes.string.isRequired,
  runnableFilter: PropTypes.string,
};

export default connect(state => ({
  invertCallstack: getInvertCallstack(state),
  onlyUserInteracting: getOnlyUserInteracting(state),
  searchString: getSearchString(state),
  categoryFilter: getCategoryFilter(state),
  platformFilter: getPlatformFilter(state),
  runnableFilter: getRunnableFilter(state),
  platforms: selectedThreadSelectors.getPlatforms(state),
}), actions)(ProfileCallTreeSettings);
