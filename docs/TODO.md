Agent: Perform items in this checklist from top to bottom. After each item, run testing, linting, and typechecking. Finally, test the feature and verify it works. When everything is complete, check the item off.

- [x] Add query search: `cardo recall food` returns results for queries with "food hall", "food store", etc.
- [x] Use console table output for `cardo recall --list`
- [x] When listing past queries with `cardo recall --list`, order by domain asc (A-Z), then createdAt desc (recent first)
- [x] Allow cards and recall to accept freeform text without quotes, i.e. `pnpm cards 1 train station`
- [ ] When running in a Claude Code context, always use --no-open functionality
- [ ] Invert --exclude-known to DEFAULT to excluding known. REMOVE the flag and REPLACE it with --include-known which OMITS the "don't include these phrases" text in the prompt.
- [ ] For freeform list queries search, OR all words, i.e. `cardo recall train station eki` recalls every phrase with train, station, OR eki in it
