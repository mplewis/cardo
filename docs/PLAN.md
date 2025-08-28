# Implementation Plan

## Phase 1: Project Setup

- [x] Initialize pnpm project with TypeScript
- [x] Set up oclif CLI framework
- [x] Configure TypeScript with strict settings
- [x] Set up Biome for linting/formatting
- [x] Configure Prettier and EditorConfig
- [x] Set up Vitest for testing
- [x] Set up dotenv for config
- [x] Configure pino logging with pino-pretty
- [x] Add tests

## Phase 2: Database Layer

- [x] Set up Prisma ORM
- [x] Create database schema for queries, phrases, and individual kanji
- [x] Configure SQLite database in system app data folder
- [x] Implement auto-migration
- [x] Create basic CRUD operations
- [x] Add tests

## Phase 3: Core Business Logic

- [x] Implement auto-consolidation logic
  - [x] Parse 2+ character phrases into Phrases table
  - [x] Extract individual kanji from breakdown columns
  - [x] Deduplicate existing kanji
- [x] Create card generation logic
- [x] Implement CSV export functionality
- [x] Add tests

## Phase 4: Output and Formatting

- [x] Implement console-table-printer for terminal display
- [x] Create separate CSV exports for phrases and individual kanji
- [x] Integrate `open` package to auto-open CSV files
- [x] Add proper logging with LOG_LEVEL support
- [x] Add tests

## Phase 5: LLM Integration

- [x] Integrate any-llm library
- [x] Create prompt templates in `resources/prompts/`
- [x] Implement LLM query functions for phrases and individual kanji
- [x] Add structured data parsing from LLM responses
- [x] Update Phase 3: Query LLM for individual kanji meanings
- [x] Add tests

## Phase 6: CLI Commands

- [ ] Implement `cards` command
  - [ ] Accept count and domain parameters
  - [ ] Generate and display terminal-formatted tables
  - [ ] Save CSV files to temp directory
  - [ ] Auto-open CSV files for user
- [ ] Implement `recall` command
  - [ ] `--all` flag for all cards
  - [ ] `--list` flag for query history
  - [ ] Query by ID functionality
- [ ] Implement `delete` command
  - [ ] Delete by query ID
  - [ ] `--with-cards` flag to delete associated cards
- [ ] Implement help documentation
- [ ] Add input validation
- [ ] Add tests
