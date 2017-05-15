import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import classNames from 'classnames';
import { timeCode } from '../../common/time-code';

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
    this._onMarkerSelected = this._onMarkerSelected.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseOut = this._onMouseOut.bind(this);

    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseIn = false;
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
    const { thread, rangeStart, rangeEnd, selectedStack } = this.props;
    const { dates } = thread;

    const devicePixelRatio = c.ownerDocument ? c.ownerDocument.defaultView.devicePixelRatio : 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * devicePixelRatio);
    c.height = Math.round(r.height * devicePixelRatio);
    const ctx = c.getContext('2d');
    const rangeLength = rangeEnd - rangeStart;

    let maxHangMs = 0;
    let maxHangCount = 0;
    for (let i = rangeStart; i < rangeEnd; i++) {
      if (dates[i].totalStackHangMs[selectedStack] > maxHangMs) {
        maxHangMs = dates[i].totalStackHangMs[selectedStack];
      }
      if (dates[i].totalStackHangCount[selectedStack] > maxHangCount) {
        maxHangCount = dates[i].totalStackHangCount[selectedStack];
      }
    }

    const xDevicePixelsPerDay = c.width / rangeLength;
    const yDevicePixelsPerHangMs = c.height / maxHangMs;
    const yDevicePixelsPerHangCount = c.height / maxHangCount;

    for (let i = rangeStart; i < rangeEnd; i++) {
      const date = dates[i];
      const timeHeight = date.totalStackHangMs[selectedStack] * yDevicePixelsPerHangMs;
      const countHeight = date.totalStackHangCount[selectedStack] * yDevicePixelsPerHangCount;
      const timeStartY = c.height - timeHeight;
      const countStartY = c.height - countHeight;
      ctx.fillStyle = '#7990c8';
      ctx.fillRect((i - rangeStart) * xDevicePixelsPerDay, timeStartY, xDevicePixelsPerDay * BAR_WIDTH_RATIO, timeHeight);
      ctx.fillStyle = '#a7b9e5';
      ctx.fillRect((i - rangeStart) * xDevicePixelsPerDay + (xDevicePixelsPerDay * BAR_WIDTH_RATIO), countStartY, xDevicePixelsPerDay * (1 - BAR_WIDTH_RATIO), countHeight);
    }

    const xPxPerDay = r.width / rangeLength;
    const yPxPerHangMs = r.height / maxHangMs;
    const yPxPerHangCount = r.height / maxHangCount;

    if (this.mouseIn) {
      const x = this.mouseX - r.left;
      const y = this.mouseY - r.top;
      const invertedY = r.height - y;

      const normalized = x / xPxPerDay;
      const floor = Math.floor(normalized);
      const fract = normalized - floor;
      const dateIndex = floor + rangeStart;
      const isCount = fract > BAR_WIDTH_RATIO;

      const date = dates[dateIndex];
      let tooltip = null;
      if (isCount) {
        if (invertedY < date.totalStackHangCount[selectedStack] * yPxPerHangCount) {
          tooltip = {
            width: 116 * devicePixelRatio,
            text: `${(1000 * date.totalStackHangCount[selectedStack]).toFixed(1)} hangs / kuh`
          };
        }
      } else {
        if (invertedY < date.totalStackHangMs[selectedStack] * yPxPerHangMs) {
          tooltip = {
            width: 140 * devicePixelRatio,
            text: `${(date.totalStackHangMs[selectedStack]).toFixed(1)} ms hanging / hr`
          };
        }
      }

      const margin = TOOLTIP_MARGIN * devicePixelRatio;
      const padding = TOOLTIP_PADDING * devicePixelRatio;
      const height = TOOLTIP_HEIGHT * devicePixelRatio;

      if (tooltip) {
        let tooltipOffset = 0;
        if (x + margin + tooltip.width > c.width) {
          tooltipOffset = 2 * margin + tooltip.width;
        }

        ctx.fillStyle = '#777';
        ctx.fillRect(x + margin - tooltipOffset, y - margin, tooltip.width, -height);
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        const totalBorder = margin + padding;
        let startX = x + totalBorder;
        ctx.fillText(tooltip.text, x + totalBorder - tooltipOffset, y - totalBorder, tooltip.width - margin - 2 * padding); 
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
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseIn = true;
    this._scheduleDraw();
  }

  _onMouseOut(e) {
    this.mouseIn = false;
    this._scheduleDraw();
  }

  _onMarkerSelected(markerIndex) {
    if (this.props.onMarkerSelect) {
      this.props.onMarkerSelect(markerIndex);
    }
    this.props.onClick();
  }

  render() {
    this._scheduleDraw();
    return (
      <div className={this.props.className}
           onMouseMove={this._onMouseMove}
           onMouseOut={this._onMouseOut}>
        <canvas className={classNames(`${this.props.className}Canvas`, 'threadStackGraphCanvas')}
                ref='canvas'
                onMouseUp={this._onMouseUp}/>
      </div>
    );
  }

}

ThreadStackGraph.propTypes = {
  thread: PropTypes.shape({
    allDates: PropTypes.object.isRequired,
  }).isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  selectedStack: PropTypes.number,
  className: PropTypes.string,
};

export default ThreadStackGraph;
