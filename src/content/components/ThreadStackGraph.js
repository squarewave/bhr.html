import React, { Component, PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import * as colors from 'photon-colors';
import actions from '../actions';
import shallowCompare from 'react-addons-shallow-compare';
import classNames from 'classnames';
import { timeCode } from '../../common/time-code';
import { getDateGraph, getTotalDateGraph } from '../reducers/date-graph';
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
    this.previousParameters = {};
  }

  _maybeScheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas && (
            this.previousParameters.rangeStart !== this.props.rangeStart ||
            this.previousParameters.rangeEnd !== this.props.rangeEnd ||
            this.previousParameters.dateGraph !== this.props.dateGraph ||
            this.previousParameters.pickedItem !== this.state.pickedItem
            )) {
          this.previousParameters = {
            rangeStart: this.props.rangeStart,
            rangeEnd: this.props.rangeEnd,
            dateGraph: this.props.dateGraph,
            pickedItem: this.state.pickedItem,
          };
          this.drawCanvas(this.refs.canvas);
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
    let { rangeStart, rangeEnd, dateGraph, totalDateGraph } = this.props;
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

    ctx.beginPath();
    ctx.fillStyle = colors.GREY_20;
    let leftmostPointSet = false;
    let leftmostPoint = 0;
    let rightmostPoint = 0;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const countHeight = totalDateGraph.totalCount[i] * yDevicePixelsPerHangCount;
      const countY = c.height - countHeight;
      const countX = (i - rangeStart) * xDevicePixelsPerDay;
      if (totalDateGraph.totalCount[i] > 0) {
        rightmostPoint = countX;
        if (!leftmostPointSet) {
          leftmostPointSet = true;
          leftmostPoint = countX;
        }
      }
      if (i == rangeStart || totalDateGraph.totalCount[i - 1] === 0) {
        ctx.moveTo(countX, countY);
      } else {
        ctx.lineTo(countX, countY);
      }
    }
    ctx.lineTo(rightmostPoint, c.height);
    ctx.lineTo(leftmostPoint, c.height);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = colors.GREY_30;
    leftmostPointSet = false;
    leftmostPoint = 0;
    rightmostPoint = 0;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const timeHeight = totalDateGraph.totalTime[i] * yDevicePixelsPerHangMs;
      const timeY = c.height - timeHeight;
      const timeX = (i - rangeStart) * xDevicePixelsPerDay;
      if (totalDateGraph.totalTime[i] > 0) {
        rightmostPoint = timeX;
        if (!leftmostPointSet) {
          leftmostPointSet = true;
          leftmostPoint = timeX;
        }
      }
      if (i == rangeStart || totalDateGraph.totalTime[i - 1] === 0) {
        ctx.moveTo(timeX, timeY);
      } else {
        ctx.lineTo(timeX, timeY);
      }
    }
    ctx.lineTo(rightmostPoint, c.height);
    ctx.lineTo(leftmostPoint, c.height);
    ctx.fill();

    ctx.beginPath();
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = colors.BLUE_50;
    ctx.fillStyle = colors.BLUE_50;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const countHeight = dateGraph.totalCount[i] * yDevicePixelsPerHangCount;
      const countY = c.height - countHeight;
      if (i == rangeStart || dateGraph.totalCount[i - 1] === 0) {
        ctx.moveTo((i - rangeStart) * xDevicePixelsPerDay, countY);
      } else {
        ctx.lineTo((i - rangeStart) * xDevicePixelsPerDay, countY);
      }
    }
    ctx.stroke();
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.strokeStyle = colors.BLUE_40;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const isPicked = pickedItem && pickedItem.dateIndex == i;
      const countHeight = dateGraph.totalCount[i] * yDevicePixelsPerHangCount;
      const countY = c.height - countHeight;
      if (dateGraph.totalCount[i]) {
        ctx.beginPath();
        ctx.arc((i - rangeStart) * xDevicePixelsPerDay, countY, 5 * devicePixelRatio, 0, 2 * Math.PI);
        ctx.fill();
        if (isPicked) {
          ctx.stroke();
        }
      }
    }

    ctx.beginPath();
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = colors.BLUE_70;
    ctx.fillStyle = colors.BLUE_70;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const timeHeight = dateGraph.totalTime[i] * yDevicePixelsPerHangMs;
      const timeY = c.height - timeHeight;
      if (i == rangeStart || dateGraph.totalTime[i - 1] === 0) {
        ctx.moveTo((i - rangeStart) * xDevicePixelsPerDay, timeY);
      } else {
        ctx.lineTo((i - rangeStart) * xDevicePixelsPerDay, timeY);
      }
    }
    ctx.stroke();

    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.strokeStyle = colors.BLUE_40;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const isPicked = pickedItem && pickedItem.dateIndex == i;
      const timeHeight = dateGraph.totalTime[i] * yDevicePixelsPerHangMs;
      const timeY = c.height - timeHeight;
      if (dateGraph.totalTime[i]) {
        ctx.beginPath();
        ctx.arc((i - rangeStart) * xDevicePixelsPerDay, timeY, 5 * devicePixelRatio, 0, 2 * Math.PI);
        ctx.fill();
        if (isPicked) {
          ctx.stroke();
        }
      }
    }
  }

  _getMaxGraphValues() {
    let { rangeStart, rangeEnd, totalDateGraph } = this.props;

    let maxHangMs = 0;
    let maxHangCount = 0;
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (totalDateGraph.totalTime[i] > maxHangMs) {
        maxHangMs = totalDateGraph.totalTime[i];
      }
      if (totalDateGraph.totalCount[i] > maxHangCount) {
        maxHangCount = totalDateGraph.totalCount[i];
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
    this._maybeScheduleDraw();
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
  totalDateGraph: PropTypes.object.isRequired,
  dates: PropTypes.array.isRequired,
  usageHoursByDate: PropTypes.object.isRequired,
  className: PropTypes.string,
};

export default connect(state => ({
  dateGraph: getDateGraph(state),
  totalDateGraph: getTotalDateGraph(state),
  usageHoursByDate: getUsageHoursByDate(state),
}), actions)(ThreadStackGraph);
