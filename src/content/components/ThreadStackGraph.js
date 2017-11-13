import React, { Component, PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import * as colors from 'photon-colors';
import actions from '../actions';
import shallowCompare from 'react-addons-shallow-compare';
import classNames from 'classnames';
import { timeCode } from '../../common/time-code';
import { getDateGraph } from '../reducers/date-graph';
import { getUsageHoursByDate } from '../reducers/profile-view';
import Tooltip from './Tooltip'

const BAR_WIDTH_RATIO = 0.8;
const TOOLTIP_MARGIN = 3;
const TOOLTIP_PADDING = 5;
const TOOLTIP_HEIGHT = 20;

class ThreadStackGraph extends Component {

  constructor(props) {
    super(props);
    this._resizeListener = () => this.forceUpdate();
    this._requestedAnimationFrame = false;
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseOut = this._onMouseOut.bind(this);
    this.state = {};
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas) {
          timeCode('ThreadStackGraph render', () => {
            this.drawCanvas(this.refs.canvas);
          });
        }
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  componentDidMount() {
    const win = this.refs.canvas.ownerDocument.defaultView;
    win.addEventListener('resize', this._resizeListener);
    this.forceUpdate(); // for initial size
  }

  componentWillUnmount() {
    const win = this.refs.canvas.ownerDocument.defaultView;
    win.removeEventListener('resize', this._resizeListener);
  }

  drawCanvas(c) {
    let { rangeStart, rangeEnd, dateGraph } = this.props;
    let { pickedItem } = this.state;

    const devicePixelRatio = c.ownerDocument ? c.ownerDocument.defaultView.devicePixelRatio : 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * devicePixelRatio);
    c.height = Math.round(r.height * devicePixelRatio);
    const ctx = c.getContext('2d');
    const rangeLength = rangeEnd - rangeStart;

    const { maxHangMs, maxHangCount } = this._getMaxGraphValues();

    const xDevicePixelsPerDay = c.width / rangeLength;
    const yDevicePixelsPerHangMs = c.height / maxHangMs;
    const yDevicePixelsPerHangCount = c.height / maxHangCount;

    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.BLUE_50;
    ctx.fillStyle = colors.BLUE_50;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const countHeight = dateGraph.totalCount[i] * yDevicePixelsPerHangCount;
      const countY = c.height - countHeight;
      if (i == 0) {
        ctx.moveTo(0, countY);
      } else {
        ctx.lineTo((i - rangeStart) * xDevicePixelsPerDay, countY);
      }
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.TEAL_50;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const isPicked = pickedItem && pickedItem.dateIndex == i;
      const countHeight = dateGraph.totalCount[i] * yDevicePixelsPerHangCount;
      const countY = c.height - countHeight;
      ctx.beginPath();
      ctx.arc((i - rangeStart) * xDevicePixelsPerDay, countY, 5, 0, 2 * Math.PI);
      ctx.fill();
      if (isPicked) {
        ctx.stroke();
      }
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.BLUE_70;
    ctx.fillStyle = colors.BLUE_70;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const timeHeight = dateGraph.totalTime[i] * yDevicePixelsPerHangMs;
      const timeY = c.height - timeHeight;
      if (i == 0) {
        ctx.moveTo(0, timeY);
      } else {
        ctx.lineTo((i - rangeStart) * xDevicePixelsPerDay, timeY);
      }
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.BLUE_40;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const isPicked = pickedItem && pickedItem.dateIndex == i;
      const timeHeight = dateGraph.totalTime[i] * yDevicePixelsPerHangMs;
      const timeY = c.height - timeHeight;
      ctx.beginPath();
      ctx.arc((i - rangeStart) * xDevicePixelsPerDay, timeY, 5, 0, 2 * Math.PI);
      ctx.fill();
      if (isPicked) {
        ctx.stroke();
      }
    }
  }

  _getMaxGraphValues() {
    let { rangeStart, rangeEnd, dateGraph } = this.props;

    let maxHangMs = 0;
    let maxHangCount = 0;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (dateGraph.totalTime[i] > maxHangMs) {
        maxHangMs = dateGraph.totalTime[i];
      }
      if (dateGraph.totalCount[i] > maxHangCount) {
        maxHangCount = dateGraph.totalCount[i];
      }
    }

    return { maxHangMs, maxHangCount };
  }

  _pickGraphItem(mouseX, mouseY, canvas) {
    const { rangeStart, rangeEnd, dateGraph, dates, usageHoursByDate } = this.props;
    const devicePixelRatio = canvas.ownerDocument ? canvas.ownerDocument.defaultView.devicePixelRatio : 1;
    const r = canvas.getBoundingClientRect();

    const rangeLength = rangeEnd - rangeStart;
    const { maxHangMs, maxHangCount } = this._getMaxGraphValues();
    const xPxPerDay = r.width / rangeLength;
    const yPxPerHangMs = r.height / maxHangMs;
    const yPxPerHangCount = r.height / maxHangCount;

    const x = mouseX - r.left;
    const y = mouseY - r.top;
    const invertedY = r.height - y;

    const normalizedX = x / xPxPerDay;
    const roundedX = Math.round(normalizedX);
    const fractX = Math.abs(normalizedX - roundedX);
    const dateIndex = roundedX + rangeStart;
    const xIsClose = fractX < 0.2;
    const normalizedY = invertedY / r.height;
    const countY = dateGraph.totalCount[dateIndex] / maxHangCount;
    const timeY = dateGraph.totalTime[dateIndex] / maxHangMs;
    const deltaY = Math.min(Math.abs(countY - normalizedY), Math.abs(timeY - normalizedY));
    const yIsClose = deltaY < 0.2;

    if (xIsClose && yIsClose) {
      return {
        dateIndex: dateIndex,
        totalTime: dateGraph.totalTime[dateIndex],
        totalCount: dateGraph.totalCount[dateIndex],
        date: dates[dateIndex],
        usageHours: usageHoursByDate[dates[dateIndex]],
      }
    }
  }

  _onMouseUp(e) {
    if (this.props.onClick) {
      const { rangeStart, rangeEnd } = this.props;
      const r = this.refs.canvas.getBoundingClientRect();

      const x = e.pageX - r.left;
      const time = rangeStart + x / r.width * (rangeEnd - rangeStart);
      this.props.onClick(time);
    }
  }

  _onMouseMove(e) {
    this.setState({
      mouseX: e.pageX,
      mouseY: e.pageY,
      pickedItem: this._pickGraphItem(e.clientX, e.clientY, this.refs.canvas),
    });
  }

  _onMouseOut(e) {
    this.setState({
      pickedItem: null
    });
  }

  render() {
    this._scheduleDraw();
    const { mouseX, mouseY, pickedItem } = this.state;
    return (
      <div className={this.props.className}
           onMouseMove={this._onMouseMove}
           onMouseOut={this._onMouseOut}>
        {pickedItem &&
          <Tooltip mouseX={mouseX} mouseY={mouseY}>
            <StackGraphTooltipContents {...pickedItem}/>
          </Tooltip>}
        <canvas className={classNames(`${this.props.className}Canvas`, 'threadStackGraphCanvas')}
                ref='canvas'
                onMouseUp={this._onMouseUp}/>
      </div>
    );
  }
}

function formatDate(dateStr /* yyyymmdd */) {
  let month = dateStr.substr(4, 2).replace(/^0/, '');
  let day = dateStr.substr(6, 2).replace(/^0/, '');
  return `${month}/${day}`;
}

function formatDecimal(decimalNumber) {
  if (decimalNumber >= 100) {
    return parseFloat(decimalNumber.toFixed(1)).toLocaleString();
  } else {
    return parseFloat(decimalNumber.toPrecision(3)).toLocaleString();
  }
}

class StackGraphTooltipContents extends PureComponent {
  render() {
    const { date, totalTime, totalCount, className, usageHours } = this.props;

    return (
      <div className={classNames('tooltipMarker', className)}>
        <div className="tooltipHeader">
          <div>
            Build date: {formatDate(date)}
          </div>
        </div>
        <div className={classNames('tooltipOneLine', 'totalTime')}>
          <div className="tooltipTiming">
            {formatDecimal(totalTime)}
          </div>
          <div className="tooltipTitle">
            ms/hr hanging in selected node
          </div>
        </div>
        <div className={classNames('tooltipOneLine', 'totalCount')}>
          <div className="tooltipTiming">
            {formatDecimal(totalCount)}
          </div>
          <div className="tooltipTitle">
            hangs/hr sampled in selected node
          </div>
        </div>
        <div className={classNames('tooltipOneLine', 'noColor')}>
          <div className="tooltipTiming">
            {Math.round(totalCount * usageHours).toLocaleString()}
          </div>
          <div className="tooltipTitle">
            samples collected
          </div>
        </div>
        <div className={classNames('tooltipOneLine', 'noColor')}>
          <div className="tooltipTiming">
            {formatDecimal(totalTime / totalCount)}
          </div>
          <div className="tooltipTitle">
            ms mean hang duration
          </div>
        </div>
      </div>
    );
  }
}

ThreadStackGraph.propTypes = {
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  dateGraph: PropTypes.object.isRequired,
  dates: PropTypes.array.isRequired,
  usageHoursByDate: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default connect(state => ({
  dateGraph: getDateGraph(state),
  usageHoursByDate: getUsageHoursByDate(state),
}), actions)(ThreadStackGraph);
