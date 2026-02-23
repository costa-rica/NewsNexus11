# tests

This folder contains all test files for the TypeScript migration project.

## Structure

- `smoke/` for app bootstrap and minimal endpoint checks.
- `helpers/` for shared setup utilities (test db setup, fixtures, auth helpers).
- Additional folders will be added by migration phase.

## Jest note

Jest is the standard runner for this project. New tests should be added under `/tests` and grouped by domain as migration progresses.
