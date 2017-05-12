import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import classNames from 'classnames';
import { timeCode } from '../../common/time-code';

class ThreadStackGraph extends Component {

  constructor(props) {
    super(props);
    this._resizeListener = () => this.forceUpdate();
    this._requestedAnimationFrame = false;
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMarkerSelected = this._onMarkerSelected.bind(this);
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
    const range = [rangeStart, rangeEnd];
    const rangeLength = range[1] - range[0];

    let maxHangMs = 0;
    let maxHangCount = 0;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i].totalStackHangMs[selectedStack] > maxHangMs) {
        maxHangMs = dates[i].totalStackHangMs[selectedStack];
      }
      if (dates[i].totalStackHangCount[selectedStack] > maxHangCount) {
        maxHangCount = dates[i].totalStackHangCount[selectedStack];
      }
    }

    const xPixelsPerDay = c.width / rangeLength;
    const yPixelsPerHangMs = c.height / maxHangMs;
    const yPixelsPerHangCount = c.height / maxHangCount;

    for (let i = rangeStart; i < rangeEnd; i++) {
      const date = dates[i];
      const timeHeight = date.totalStackHangMs[selectedStack] * yPixelsPerHangMs;
      const countHeight = date.totalStackHangCount[selectedStack] * yPixelsPerHangCount;
      const timeStartY = c.height - timeHeight;
      const countStartY = c.height - countHeight;
      ctx.fillStyle = '#7990c8';
      ctx.fillRect((i - range[0]) * xPixelsPerDay, timeStartY, xPixelsPerDay * 0.9, timeHeight);
      ctx.fillStyle = '#a7b9e5';
      ctx.fillRect((i - range[0]) * xPixelsPerDay + (xPixelsPerDay * 0.9), countStartY, xPixelsPerDay * 0.1, countHeight);
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

  _onMarkerSelected(markerIndex) {
    if (this.props.onMarkerSelect) {
      this.props.onMarkerSelect(markerIndex);
    }
    this.props.onClick();
  }

  render() {
    this._scheduleDraw();
    return (
      <div className={this.props.className}>
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
  onClick: PropTypes.func,
  onMarkerSelect: PropTypes.func,
};

export default ThreadStackGraph;
