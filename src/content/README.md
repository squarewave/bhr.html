# Content

The content thread handles all of the user interaction and views of the application. It should limit itself to these activites, and must offload all computation and processing to the worker thread. The worker thread does the heavy lifting leaving the main thread jank-free. Information is dispatched to the worker through Redux's action system.

## Actions

The content actions behave like normal Redux actions with one additional feature.

## Reducers

These are typical Redux reducers.
