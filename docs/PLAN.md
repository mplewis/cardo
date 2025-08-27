# Implementation Plan

## Phase 1: Project Setup

- [ ] Initialize pnpm project with TypeScript
- [ ] Set up oclif CLI framework
- [ ] Configure TypeScript with strict settings
- [ ] Set up Biome for linting/formatting
- [ ] Configure Prettier and EditorConfig
- [ ] Set up Vitest for testing
- [ ] Set up dotenv for config
- [ ] Configure pino logging with pino-pretty
- [ ] Add tests

## Phase 2: Database Layer

- [ ] Set up Prisma ORM
- [ ] Create database schema for queries, phrases, and individual kanji
- [ ] Configure SQLite database in system app data folder
- [ ] Implement auto-migration
- [ ] Create basic CRUD operations
- [ ] Add tests

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
