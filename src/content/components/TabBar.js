import React, { PureComponent, PropTypes } from 'react';
import classNames from 'classnames';
import Reorderable from './Reorderable';

class TabBar extends PureComponent {

  constructor(props) {
    super(props);
    this._mouseDownListener = this._mouseDownListener.bind(this);
  }

  _mouseDownListener(e) {
    this.props.onSelectTab(e.target.dataset.name);
  }

  render() {
    const { className, tabs, selectedTabName } = this.props;
    return (
      <div className={classNames('tabBarContainer', className)}>
        <ol className='tabBarTabWrapper' orient='horizontal'>
          {
            tabs.map(({ name, title }, i) => (
              <li className={classNames('tabBarTab', 'grippy', { selected: name === selectedTabName })}
                  key={i}
                  data-name={name}
                  onMouseDown={this._mouseDownListener}>
                {title}
              </li>
            ))
          }
        </ol>
      </div>
    );
  }

}

TabBar.propTypes = {
  className: PropTypes.string,
  tabs: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  })).isRequired,
  selectedTabName: PropTypes.string.isRequired,
  onSelectTab: PropTypes.func.isRequired,
};

export default TabBar;
