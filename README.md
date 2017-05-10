# hangs.html

hangs.html visualizes [performance data] collected via Firefox telemetry. It is
a tool designed to visualize browser hang information collected from many
different Firefox instances. The interface was adapted from [perf.html], the
profiler [Mozilla] uses in developing Firefox. hangs.html is a web application
built using [React] and [Redux] and runs entirely client-side.

Mozilla develops this tool for examining the performance of [Firefox] as
well as examining web page performance in the Firefox Developer Tools.

### Usage

TODO

### Development

```bash
git clone git@github.com:devtools-html/perf.html.git

cd perf.html
npm install

npm start
```

> To run a faster production version use `npm run start-prod` instead of `npm start`

### License

[MPL v2](./LICENSE)

[performance data]:https://github.com/squarewave/background-hang-reporter-job
[perf.html]:https://github.com/devtools-html/perf.html
[React]:https://facebook.github.io/react/
[Redux]:http://redux.js.org/
[Mozilla]:https://www.mozilla.org/
[Firefox]:https://www.mozilla.org/firefox/
[Cleopatra]: https://github.com/mozilla/cleopatra
[Gecko Profiler]: https://github.com/devtools-html/Gecko-Profiler-Addon
