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

- [ ] Implement auto-consolidation logic
  - [ ] Parse 2+ character phrases into Phrases table
  - [ ] Extract individual kanji from breakdown columns
  - [ ] Deduplicate existing kanji
  - [ ] Query LLM for individual kanji meanings
- [ ] Create card generation logic
- [ ] Implement CSV export functionality
- [ ] Add tests

## Phase 6: Output and Formatting

- [ ] Implement console-table-printer for terminal display
- [ ] Create separate CSV exports for phrases and individual kanji
- [ ] Integrate `open` package to auto-open CSV files
- [ ] Add proper logging with LOG_LEVEL support
- [ ] Add tests

## Phase 4: LLM Integration

- [ ] Integrate any-llm library
- [ ] Create prompt templates in `resources/prompts/`
- [ ] Implement LLM query functions for phrases and individual kanji
- [ ] Add structured data parsing from LLM responses
- [ ] Add tests

## Phase 5: CLI Commands

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
