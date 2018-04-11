/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import { selectedThreadSelectors } from '../reducers/profile-view';
import { getDurationSpec, getHistorical } from '../reducers/url-state';
import { getDateGraph, getTotalDateGraph } from '../reducers/date-graph';
import sigData from '../../common/data/signatures';
import actions from '../actions';
import ArrowPanel from './ArrowPanel';
import ButtonWithPanel from './ButtonWithPanel';

require('./ProfileTopBarActions.css');

// TODO(doug): these actions are fairly unrelated and should probably be pulled into separate files,
// but the css for them should still be together, so I'm not sure what to do.
class ProfileTopBarActions extends PureComponent {
  constructor(props) {
    super(props);
    this._fileABugPanelOpen = this._fileABugPanelOpen.bind(this);
    this._toggleHistorical = this._toggleHistorical.bind(this);
    this.state = {bugMap: {}, bugs: {exact: [], partial: []}};
  }

  _toggleHistorical() {
    window.location = `/?durationSpec=${this.props.durationSpec}&historical=${!this.props.historical}`;
  }

  _fileABugPanelOpen() {
    const {
      durationSpec,
      selectedStack,
      tree,
      thread,
      dateGraph,
    } = this.props;
    const { stringTable, funcTable, stackTable } = thread;

    let stack = '';
    let stackIndex = selectedStack;

    do {
      const funcIndex = stackTable.func[stackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack += stringTable.getString(stringIndex) + '\n';
      stackIndex = stackTable.prefix[stackIndex];
    } while (stackIndex !== -1);

    // The following values aren't _quite_ correct. We need to collect the total subsession lengths for
    // each date in order to appropriately weigh them. They are all in the same ballpark, though, so
    // this shouldn't be too far off for now.
    const avgHangMs = dateGraph.totalTime.reduce((a,b) => a + b, 0) / dateGraph.length;
    const avgHangCount = dateGraph.totalCount.reduce((a,b) => a + b, 0) / dateGraph.length;

    const node = tree.getNode(selectedStack);

    let splitStack = stack.split('\n');
    if (splitStack.length > 1) {
      splitStack = splitStack.filter(s => s != '(root)');
    }
    const topFrame = splitStack[0].replace(/(?:\([^(]*\))?\s*$/, '');
    const shortDesc = `${avgHangCount.toPrecision(2)} ${this.durationSpecClass(durationSpec)} hangs / hr in ${topFrame}`;
    const longDesc =
`Category: ${this.friendlyDurationSpec(durationSpec)}
Process: ${thread.processType}
Thread: ${thread.name}
Hang time: ${avgHangMs.toPrecision(4)} ms / hr
Number of hangs: ${avgHangCount.toPrecision(4)} hangs / hr
Stack:
${splitStack.map(f => '    ' + f).join('\n')}
`;

    const uri = `https://bugzilla.mozilla.org/enter_bug.cgi?assigned_to=nobody%40mozilla.org&blocked=&bug_file_loc=http%3A%2F%2F&bug_ignored=0&bug_severity=normal&bug_status=NEW&cf_fx_iteration=---&cf_fx_points=---&cf_platform_rel=---&cf_status_firefox52=---&cf_status_firefox53=---&cf_status_firefox54=---&cf_status_firefox55=---&cf_status_firefox_esr45=---&cf_status_firefox_esr52=---&cf_tracking_firefox52=---&cf_tracking_firefox53=---&cf_tracking_firefox54=---&cf_tracking_firefox55=---&cf_tracking_firefox_esr45=---&cf_tracking_firefox_esr52=---&cf_tracking_firefox_relnote=---&comment=${encodeURIComponent(longDesc)}&component=Untriaged&contenttypemethod=autodetect&contenttypeselection=text%2Fplain&defined_groups=1&flag_type-203=X&flag_type-37=X&flag_type-41=X&flag_type-5=X&flag_type-607=X&flag_type-720=X&flag_type-721=X&flag_type-737=X&flag_type-748=X&flag_type-781=X&flag_type-787=X&flag_type-799=X&flag_type-800=X&flag_type-803=X&flag_type-835=X&flag_type-846=X&flag_type-855=X&flag_type-864=X&flag_type-905=X&flag_type-914=X&flag_type-916=X&form_name=enter_bug&maketemplate=Remember%20values%20as%20bookmarkable%20template&op_sys=Unspecified&priority=--&product=Firefox&rep_platform=Unspecified&short_desc=${encodeURIComponent(shortDesc)}&status_whiteboard=%5Bbhr-html%5D%5Bqf%5D&target_milestone=---&version=unspecified`;

    const bugs = this.resolveSignatureToBugs(sigData, splitStack);
    if (bugs.exact.length || bugs.partial.length) {
      const bugsConcat = bugs.exact.concat(bugs.partial);
      fetch(`https://bugzilla.mozilla.org/rest/bug?id=${bugsConcat.join(',')}&include_fields=summary,status,resolution`)
        .then(d => d.json())
        .then(d => {
          if (d.bugs && d.bugs.length === bugsConcat.length) {
            const bugMap = {};
            for (let i = 0; i < bugsConcat.length; i++) {
              bugMap[bugsConcat[i]] = d.bugs[i];
            }
            this.setState({bugMap});
          }
        });
    }

    this.setState({fileABugUri: uri, bugs, shortDesc});
  }

  // Taken from mconley's ohnoreflow
  resolveSignatureToBugs(sigData, signatureToResolve) {
    let exact = new Set();
    let partial = new Set();

    for (let sigEntry of sigData) {
      let signatures = sigEntry.signatures;
      let bugs = sigEntry.bugs;

      for (let signature of signatures) {
        let matchLines = 0;
        let matchMin = Math.min(signatures.length, signatureToResolve.length);
        for (let i = 0; i < matchMin; ++i) {
          if (signature[i] == signatureToResolve[i]) {
            matchLines++;
          } else {
            break;
          }
        }

        if (matchLines > 0) {
          if (matchLines == matchMin) {
            for (let bug of bugs) {
              exact.add(bug);
            }
            break;
          } else {
            for (let bug of bugs) {
              partial.add(bug);
            }
          }
        }
      }
    }

    return { exact: Array.from(exact), partial: Array.from(partial) };
  }

  durationSpecClass(s) {
    switch (s) {
      case '128_512':
        return 'mild';
      case '512_2048':
        return 'moderate';
      case '2048_65536':
        return 'severe';
    }
  }

  friendlyDurationSpec(s) {
    switch (s) {
      case '128_512':
        return '128ms-512ms Hangs';
      case '512_2048':
        return '512ms-2048ms Hangs';
      case '2048_65536':
        return 'Hangs longer than 2048ms';
    }
  }

  render() {
    const { durationSpec, historical } = this.props;
    const { bugs, bugMap, shortDesc } = this.state;

    function bugzillaBug(number) {
      return `https://bugzilla.mozilla.org/show_bug.cgi?id=${number}`;
    }

    const possibleDuplicates = bugs.exact.length || bugs.partial.length;

    function fileABugContents() {
      if (possibleDuplicates) {
        return (
          <section>
            {bugs.exact.map(b => (
              <p key={b}>
                <a
                  className="profileDurationSpecLink"
                  href={bugzillaBug(b)}
                >
                  {bugMap[b] ? bugMap[b].summary : `Bug ${b}`}
                </a>
              </p>
            ))}
            {bugs.partial.map(b => (
              <p key={b}>
                <a
                  className="profileDurationSpecLink"
                  href={bugzillaBug(b)}
                >
                  {bugMap[b] ? bugMap[b].summary : `Bug ${b} (partial match)`}
                </a>
              </p>
            ))}
          </section>
        );
      } else {
        return (
          <p>
            {shortDesc}
          </p>
        )
      }
    }

    return (
      <div className="profileTopBarActions">
        <ButtonWithPanel
          className="fileABugButton"
          label="File a Bug"
          panel={
            <ArrowPanel
              className="fileABugPanel"
              title={possibleDuplicates ? 'Possible Duplicates Found' : 'File a Bug'}
              onOpen={this._fileABugPanelOpen}
              okButtonText={possibleDuplicates ? 'Continue Filing' : 'File'}
              cancelButtonText="Cancel"
              onOkButtonClick={() => window.open(this.state.fileABugUri)}
            >
              {fileABugContents()}
            </ArrowPanel>
          } />
        <input type='button'
               className="profileHistoricalButton"
               value={historical ? "Show recent data" : "Show historical data"}
               onClick={this._toggleHistorical}/>
        <ButtonWithPanel
          className="profileDurationSpecButton"
          label={'Viewing ' + this.friendlyDurationSpec(durationSpec)}
          panel={
            <ArrowPanel
              className="profileDurationSpecPanel"
              title="View Other Hangs"
            >
              <section>
                {['128_512', '512_2048', '2048_65536'].map(s => (
                  s != durationSpec && <p key={s}>
                    <a
                      className="profileDurationSpecLink"
                      href={`/?durationSpec=${s}`}
                    >
                      {this.friendlyDurationSpec(s)}
                    </a>
                  </p>
                ))}
              </section>
            </ArrowPanel>
          }
        />
      </div>
    );
  }
}

ProfileTopBarActions.propTypes = {
};

export default connect(
  state => ({
    durationSpec: getDurationSpec(state),
    historical: getHistorical(state),
    thread: selectedThreadSelectors.getFilteredThread(state),
    selectedStack: selectedThreadSelectors.getSelectedStack(state),
    tree: selectedThreadSelectors.getCallTree(state),
    dateGraph: getDateGraph(state),
    totalDateGraph: getTotalDateGraph(state),
  }),
  actions
)(ProfileTopBarActions);
