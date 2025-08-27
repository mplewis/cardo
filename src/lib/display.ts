import { Table } from 'console-table-printer'
import type { CardData } from './card'

/**
 * Display card data in formatted terminal tables
 */
export function displayCards(cardData: CardData): void {
  if (cardData.phrases.length > 0) {
    console.log('\n📝 Phrases:')
    const phrasesTable = new Table({
      title: 'Japanese Phrases',
      columns: [
        { name: 'kanji', title: 'Kanji', alignment: 'left' },
        { name: 'englishMeaning', title: 'English', alignment: 'left' },
        { name: 'phoneticKana', title: 'Kana', alignment: 'left' },
        { name: 'phoneticRomaji', title: 'Romaji', alignment: 'left' },
        { name: 'kanjiBreakdown', title: 'Breakdown', alignment: 'left' },
      ],
    })

    for (const phrase of cardData.phrases) {
      phrasesTable.addRow({
        kanji: phrase.kanji,
        englishMeaning: phrase.englishMeaning,
        phoneticKana: phrase.phoneticKana,
        phoneticRomaji: phrase.phoneticRomaji,
        kanjiBreakdown: phrase.kanjiBreakdown,
      })
    }

    phrasesTable.printTable()
  }

  if (cardData.kanji.length > 0) {
    console.log('\n🈂️ Individual Kanji:')
    const kanjiTable = new Table({
      title: 'Individual Kanji Characters',
      columns: [
        { name: 'kanji', title: 'Kanji', alignment: 'center' },
        { name: 'englishMeaning', title: 'English', alignment: 'left' },
        { name: 'phoneticKana', title: 'Kana', alignment: 'left' },
        { name: 'phoneticRomaji', title: 'Romaji', alignment: 'left' },
      ],
    })

    for (const kanji of cardData.kanji) {
      kanjiTable.addRow({
        kanji: kanji.kanji,
        englishMeaning: kanji.englishMeaning,
        phoneticKana: kanji.phoneticKana,
        phoneticRomaji: kanji.phoneticRomaji,
      })
    }

    kanjiTable.printTable()
  }

  if (cardData.phrases.length === 0 && cardData.kanji.length === 0) {
    console.log('\n📭 No cards found.')
  }
}

/**
 * Display summary statistics for card data
 */
export function displaySummary(cardData: CardData): void {
  const summaryTable = new Table({
    title: 'Card Summary',
    columns: [
      { name: 'type', title: 'Type', alignment: 'left' },
      { name: 'count', title: 'Count', alignment: 'right' },
    ],
  })

  summaryTable.addRow({
    type: 'Phrases (2+ characters)',
    count: cardData.phrases.length,
  })

  summaryTable.addRow({
    type: 'Individual Kanji',
    count: cardData.kanji.length,
  })

  summaryTable.addRow({
    type: 'Total Cards',
    count: cardData.phrases.length + cardData.kanji.length,
  })

  summaryTable.printTable()
}
