# Goal

Build a CLI app that generates Anki deck flashcards for learning Japanese kanji.

The flashcards are to help travelers learn kanji for their visits to Japan, so focus on common use (signage, real life, etc.) above all else (technical grammar, etc.)

# Types of Cards

There are two types of cards:

## Phrases

These cards focus on phrases that visitors will commonly see in written signage in train stations, restaurants, etc.

Use the following columns:

- Kanji: The kanji that make up the phrase
- English Meaning: The meaning of the phrase in English
- Phonetic Kana: The kana that demonstrate how to pronounce this phrase
- Phonetic Romaji: The romanization pronunciation of this phrase
- Kanji Breakdown: What each kanji in the phrase means, or "kata only" if there aren't any

An example table with a few rows:

| English Meaning | Kanji    | Phonetic Kana | Kanji Breakdown                         |
| --------------- | -------- | ------------- | --------------------------------------- |
| Exit            | 出口     | でぐち        | 出 = exit, go out / 口 = mouth, opening |
| Cash Only       | 現金のみ | げんきんなみ  | 現金 = cash / のみ = only               |
| Pharmacy        | 薬局     | やっきょく    | 薬 = medicine / 局 = office             |

ALL phrases are at least TWO symbols. Anything that is 1 symbol is NOT a phrase.

## Individual kanji

These cards focus on learning the common and multiple meanings of individual kanji. Since these are building blocks for larger phrases, learning individual usages can help the student build up a library of important "words" that they can recognize in everyday life.

Use the following columns:

- Kanji: The kanji that make up the phrase
- English Meaning: The meaning of the phrase in English
- Phonetic Kana: The kana that demonstrate how to pronounce this word
- Phonetic Romaji: The romanization pronunciation of this word

An example table with a few rows:

| English Meaning         | Kanji | Phonetic Kana | Phonetic Romaji |
| ----------------------- | ----- | ------------- | --------------- |
| not, non-               | 不    | ふ            | fu              |
| middle, inside, during  | 中    | ちゅう        | chuu            |
| prepare, provide, equip | 備    | び            | bi              |

ALL individual kanji are exactly ONE kanji symbol.

Signage and kanji are printed to the user separately so the user can manage their cards separately.

# Architecture

- pnpm, vitest, node, typescript: `pnpm run`
- LLM interface: https://github.com/mozilla-ai/any-llm
- run with npm scripts and tsx
- strictest typescript and biome config: `pnpm lint`, `pnpm lint:fix`
- prettier + editorconfig (run on fix)
- CLI interface: oclif
- SQL interface: Prisma
- Formatting: pino, pino-pretty (use on all TTY), LOG_LEVEL env var, https://github.com/console-table-printer/console-table-printer
- env: dotenv

# Structure

- Source files live in `src/`
- Prompts live in `resources/prompts/`
- You must write the prompts that guide the LLM to return structured data.

# Workflow

The user queries an LLM to build flashcards for them based on a target domain:

```sh
pnpm cards --help

# Query for cards
pnpm cards 20 Common phrases seen on signage # Default output format is terminal-formatted table
pnpm cards 10

pnpm recall --all # all signage and kanji cards
pnpm recall --list # List all prompts + counts + ID (int autoincrement)
pnpm recall 1 # an ID from the list

pnpm delete 1 --with-cards # delete a query and associated cards
```

When queried or recalled, table is printed to the terminal and a CSV for each signage/kanji table is saved to a new tempdir. Open for the user with https://www.npmjs.com/package/open.

# Features

## Auto-consolidation

Query the LLM for the user's prompt. The LLM returns a table of 1 char (kanji, but not detailed enough) or 2+ chars (phrases with breakdown).

First, turn all 2+ chars into Phrases rows.

Then, parse all individual 1-char kanji out of the Kanji Breakdown column, and combine them with the 1-char kanji from the table.

Remove any from the list that already exist.

Next, query the LLM for meanings of those kanji.

Finally, turn those into Individual Kanji rows.

## Library

To minimize LLM costs, we gather all results and cache them locally in a SQLite DB on a card basis, i.e. every structured table row we get back from the LLM turns into a row in the DB, which can be exported to a flashcard later.

The schema looks like:

User query -> has many -> Phrases
User query -> has many -> Individual kanji

SQLite DB is stored in the system's app data folder under the name of this app, cardo. Create and automigrate as necessary.
