# Prototype of file system based routing in Vaadin

Findings and compromises:
* `export const meta = {}` breaks HMR. https://github.com/vitejs/vite/discussions/4583
* Main layout is hard coded
* File watcher does not react to files being deleted
* Lazy views
* Use a faster alterantive for parsing TS
* `meta` must be strictly valid JSON. Consider something like https://github.com/json5/json5 for a more relaxed syntax
* Add support for route parameters
* Avoid conflicts in views.ts when there are multiple views with the same function name
* Configure Spring Security
* Cache views.json in production mode instead of reading and parsing for each request
* Avoid slow Java redeploy for views.json changes: server-side watcher to refresh security config, HMR or dev mode ws for metadata updates
* Use view info on the server to return 404 for missing routes
* Flow views are picked up only if at least one view was present when the server started
* Use SessionRouteRegistry if available
* Should read initial views.json content when starting to avoid an initial redeploy

