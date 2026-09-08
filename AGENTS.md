# AGENTS.md

## Project status

- This library is pre-1.0 and is not API-stable
- Breaking changes are expected and acceptable when they improve correctness, consistency, ergonomics, or maintainability
- Do not preserve an API shape only because it appears in existing documentation
- Don't commit automatically

## Source of truth

- Source code and tests are authoritative
- Existing docs, README content, and examples are descriptive and may lag behind the implementation
- If code and docs disagree, prefer the code and tests, then update the docs to match the new actual state
- Do not treat current documentation as a compatibility contract

## Change policy

- Prefer the cleanest API and implementation for the current library state over backwards compatibility
- Renaming, removing, or reshaping decorators, options, exports, and behavior is acceptable before a stable release
- Keep changes intentional and coherent across code, tests, exports, and docs
- When changing public behavior, update tests first or alongside the implementation so the intended state is explicit

## Working expectations

- Only standard TC39 decorators are implemented; `experimentalDecorators` projects use the `legacy()` adapter. Do not add per-decorator legacy variants
- Keep decorator behavior consistent across sync and async variants when that consistency is part of the design
- Preserve or deliberately revise existing implementation constraints based on code reality, not on outdated prose
- After changing behavior or APIs, update documentation to reflect the implementation that now exists

## Validation

- Use `bun test` for behavior changes
- Use `bun typecheck` for type-level or export-surface changes
- Use `bun fmt` after edits when formatting is needed

## PR feedback

- When analyzing PR feedback use `gh` or github tools to get the full context of comments, discussions, and change requests
- When implementing PR feedback changes resolve the requested changes if they were relevant and implement the requested changes

## Agent Summary

- Include a conventional commit message in the output reflecting the applied changes, so it can be used directly based on their scope
