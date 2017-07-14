import React, { Component, PropTypes } from 'react';

const HEIGHT = 30;
const FILL = '#7990c8';

class SummarizeBarGraph extends Component {
  componentDidMount() {
    const resize = () => this.updateWidth();
    window.addEventListener('resize', resize);
    this.setState({resize});
    this.updateWidth();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.state.resize);
  }

  componentWillReceiveProps(props) {
    this.updateWidth(props);
  }

  updateWidth(props = this.props) {
    if (!props.rollingSummary) {
      return;
    }
    const {rollingSummary, name} = props;
    const width = this.el.offsetWidth;

    const rects = rollingSummary.map(({percentage}, i) => ([
      width * (i / (rollingSummary.length)),
      HEIGHT * (1 - (percentage[name] || 0)),
      width / rollingSummary.length,
      HEIGHT
    ]));

    this.setState({ width, rects });
  }

  render() {
    return (
      <div className='summarize-bar-graph' ref={el => { this.el = el; }}>
        {
          this.state && this.props && this.props.rollingSummary
            ? <svg
                style={{width: this.state.width + 'px', height: HEIGHT + 'px'}}
                width={this.state.width}
                height={HEIGHT}>
                {this.state.rects.map((r,i) => (
                  <rect x={round(r[0])} y={round(r[1])} width={round(r[2])} height={round(r[3])} fill={FILL} key={i}/>
                ))}
              </svg>
            : <div
                style={{height: HEIGHT + 'px'}}
                className={`${this.props.isBlank ? '' : 'filler'} summarize-bar-graph-filler`}>{!this.props.isBlank && 'Loading...'}</div>
        }
      </div>
    );
  }
}

SummarizeBarGraph.propTypes = {
  rollingSummary: PropTypes.array,
  name: PropTypes.string,
  isBlank: PropTypes.bool,
};

export default SummarizeBarGraph;

function round(n) {
  return Math.round(n * 1000) / 1000;
}
