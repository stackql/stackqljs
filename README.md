[![StackQL](https://stackql.io/img/stackql-logo-bold.png)](https://stackql.io/)  
<br />
[![GitHub Actions](https://github.com/stackql/stackqljs/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/stackql/stackqljs/actions/workflows/main.yml)
![License](https://img.shields.io/github/license/stackqljs/stackql)

# stackqljs

[__StackQL__](https://github.com/stackql/stackql) client library for Deno and Node.js that exposes all features StackQL.  

## Requirements

- Written in TypeScript
- Usable in Deno and Node.js (see [pgwire](https://github.com/kagis/pgwire) for an example of a dual purpose package)
- No dependencies
- Works in server mode (as a pg wire protocol server client) as well as local mode where it is a wrapper for the `stackql` binary for the target platform
- Exposes methods analagous to [`pystackql`](https://pystackql.readthedocs.io/en/latest/), including:
    - `connect` - connect to a StackQL server - if in server mode
    - `upgrade` - if in local mode, upgrade the local stackql binary from the latest release
    - `execute` - execute a query returns an array of rows (objects)
    - `executeStmt` - executes a statement and returns a string (like `REGISTRY PULL` or `INSERT ...`)
    - `executeQueriesAsync` - executes a list of queries and returns an array of rows (objects) - queries need to return the same columns/schema