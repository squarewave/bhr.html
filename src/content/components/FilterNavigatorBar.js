import React, { PureComponent, PropTypes } from 'react';
import classNames from 'classnames';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import './FilterNavigatorBar.css';

class FilterNavigatorBar extends PureComponent {
  constructor(props) {
    super(props);
    this._onLiClick = this._onLiClick.bind(this);
  }

  _onLiClick(e) {
    const index = e.target.closest('.filterNavigatorBarItem').dataset.index|0;
    this.props.onPop(index);
  }

  render() {
    const { className, items, selectedItem, includeHome } = this.props;
    return (
      <ReactCSSTransitionGroup transitionName='filterNavigatorBarTransition'
                               transitionEnterTimeout={300}
                               transitionLeaveTimeout={300}
                               component='ol'
                               className={classNames('filterNavigatorBar', className)}>
        {includeHome && <li className={classNames(
            'filterNavigatorBarItem',
            'filterNavigatorBarRootItem'
          )}
            onClick={() => window.location.href = '/'}>
          <span className='filterNavigatorBarItemContent'>Home</span>
        </li>}
        {
          items.map((item, i) => (
            <li key={i}
                data-index={i}
                className={classNames(
                  'filterNavigatorBarItem', {
                    'filterNavigatorBarBeforeSelectedItem': i === selectedItem - 1,
                    'filterNavigatorBarSelectedItem': i === selectedItem,
                    'filterNavigatorBarLeafItem': i === items.length - 1,
                  })}
                onClick={this._onLiClick}>
              <span className='filterNavigatorBarItemContent'>{item}</span>
            </li>
          ))
        }
      </ReactCSSTransitionGroup>
    );
  }
}

FilterNavigatorBar.propTypes = {
  className: PropTypes.string,
  items: PropTypes.array.isRequired,
  selectedItem: PropTypes.number.isRequired,
  onPop: PropTypes.func.isRequired,
};

export default FilterNavigatorBar;
