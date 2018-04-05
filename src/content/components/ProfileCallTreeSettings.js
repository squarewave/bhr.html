import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import ReactModal from 'react-modal';
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
    this._onCategoryFilterCheckboxChanged = this._onCategoryFilterCheckboxChanged.bind(this);
    this._onCategoryFilterSelectAllClicked = this._onCategoryFilterSelectAllClicked.bind(this);
    this._onCategoryFilterClearAllClicked = this._onCategoryFilterClearAllClicked.bind(this);
    this._onCategoryFilterCloseModal = this._onCategoryFilterCloseModal.bind(this);
    this._onPlatformFilterChange = this._onPlatformFilterChange.bind(this);
    this._onRunnableFilterClick = this._onRunnableFilterClick.bind(this);

    let categoryFilters;
    const categoryFilterStr = this.props.categoryFilter;
    if (categoryFilterStr == 'all') {
      categoryFilters = new Set(categoryNames);
    } else if (categoryFilterStr[0] == '-') {
      categoryFilters = new Set(categoryNames);
      categoryFilterStr.substr(1).split(',').forEach(c => categoryFilters.delete(c));
    } else {
      categoryFilters = new Set(categoryFilterStr.split(','));
    }
    this.state = {
      categoryModal: false,
      categoryFilters,
    };
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

  _onCategoryFilterCheckboxChanged(e) {
    const categoryFilters = new Set(this.state.categoryFilters);
    if (e.target.checked) {
      categoryFilters.add(e.target.name);
    } else {
      categoryFilters.delete(e.target.name);
    }
    this.setState({categoryFilters});
  }

  _onCategoryFilterSelectAllClicked(e) {
    this.setState({categoryFilters: new Set(categoryNames)});
  }

  _onCategoryFilterClearAllClicked(e) {
    this.setState({categoryFilters: new Set()});
  }

  _onCategoryFilterCloseModal() {
    this.setState({categoryModal: false});

    const excluded = categoryNames.filter(c => !this.state.categoryFilters.has(c));
    if (excluded.length == 0) {
      this.props.changeCategoryFilter('all');
    } else if (excluded.length < categoryNames.length / 2) {
      this.props.changeCategoryFilter('-' + excluded.join(','));
    } else {
      this.props.changeCategoryFilter(Array.from(this.state.categoryFilters).join(','));
    }
  }

  _onPlatformFilterChange(e) {
    this.props.changePlatformFilter(e.target.value);
  }

  render() {
    const {
      invertCallstack,
      searchString,
      platformFilter,
      runnableFilter,
      onlyUserInteracting,
      platforms,
      categoryFilter,
    } = this.props;

    const {
      categoryFilters,
      categoryModal,
    } = this.state;

    return (
      <div className='profileCallTreeSettings'>
        <ReactModal
           className='profileCallTreeSettingsModal'
           isOpen={categoryModal}
           onRequestClose={() => this.setState({categoryModal: false})}
           contentLabel='Select Categories'>
          <div className='profileCallTreeSettingsModalHeader'>
            <h2>Select Categories</h2>
            <button onClick={this._onCategoryFilterSelectAllClicked}>Select All</button>
            <button onClick={this._onCategoryFilterClearAllClicked}>Clear All</button>
          </div>
          <div className='profileCallTreeSettingsModalContent'>
            <ul className='profileCallTreeSettingsModalList'>
              {categoryNames.map(c => (
                <li key={c}>
                  <label>
                    <input name={c}
                      type='checkbox'
                      checked={categoryFilters.has(c)}
                      onChange={this._onCategoryFilterCheckboxChanged}/>
                    {c}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className='profileCallTreeSettingsModalFooter'>
            <button className='profileCallTreeSettingsModalSaveButton' onClick={this._onCategoryFilterCloseModal}>Save</button>
          </div>
        </ReactModal>
        <ul className='profileCallTreeSettingsList'>
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
          <li className="profileCallTreeSettingsListItem">
            <span className="profileCallTreeSettingsCategories"
                  onClick={() => this.setState({categoryModal: true})}>
              Categories: {categoryFilter}
            </span>
          </li>
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
