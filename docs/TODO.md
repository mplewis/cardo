Agent: Perform items in this checklist from top to bottom. After each item, run testing, linting, and typechecking. Finally, test the feature and verify it works. When everything is complete, check the item off.

- [x] Add query search: `cardo recall food` returns results for queries with "food hall", "food store", etc.
- [x] Use console table output for `cardo recall --list`
- [x] When listing past queries with `cardo recall --list`, order by domain asc (A-Z), then createdAt desc (recent first)
- [x] Allow cards and recall to accept freeform text without quotes, i.e. `pnpm cards 1 train station`
- [x] When running in a Claude Code context, implicitly activate the --no-open functionality
- [x] Invert --exclude-known to DEFAULT to excluding known. REMOVE the flag and REPLACE it with --include-known which OMITS the "don't include these phrases" text in the prompt.
- [x] For freeform list queries search, OR all words, i.e. `cardo recall train station eki` recalls every phrase with train, station, OR eki in it
- [x] On failure to parse LLM JSON response, print the entire (cleaned and concatenated) response for review
- [x] Review all structlog log lines (pino) and use structured logging for all values, NOT interpolation. i.e. "Generated 5 cards and 3 kanji" => "Generated cards" + {cards: 5, kanji: 3}
- [x] Implement from tmp/REPORT.md: # 1. Database Connection and Error Handling Pattern
- [ ] We have a validation error that is inappropriate. It's VALID for the LLM to return 1-kanji phrases, but we need to NOT include them as phrases and simply move them to the kanji lookup step 2. Fix validation so that this is not part of incoming JSON validation, but short items are moved directly to step 2. `{ "origin": "string", "code": "too_small", "minimum": 2, "inclusive": true, "path": [ 7, "kanji" ], "message": "Too small: expected string to have >=2 characters" }`
- [ ] Implement from tmp/REPORT.md: # 2. Data Mapping and Transformation Patterns
- [ ] Implement from tmp/REPORT.md: # 3. CSV Export File Opening Logic
- [ ] Implement from tmp/REPORT.md: # 7. Environment Variable Configuration
- [ ] Implement from tmp/REPORT.md: # 9. Constant Extraction
- [ ] Implement from tmp/REPORT.md: # 10. Type Interface Consolidation
