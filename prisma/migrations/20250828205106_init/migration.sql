-- CreateTable
CREATE TABLE "Query" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Phrase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "englishMeaning" TEXT NOT NULL,
    "kanji" TEXT NOT NULL,
    "phoneticKana" TEXT NOT NULL,
    "phoneticRomaji" TEXT NOT NULL,
    "kanjiBreakdown" TEXT NOT NULL,
    "queryId" INTEGER NOT NULL,
    CONSTRAINT "Phrase_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "englishMeaning" TEXT NOT NULL,
    "kanji" TEXT NOT NULL,
    "phoneticKana" TEXT NOT NULL,
    "phoneticRomaji" TEXT NOT NULL,
    "queryId" INTEGER NOT NULL,
    CONSTRAINT "Kanji_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Phrase_kanji_queryId_key" ON "Phrase"("kanji", "queryId");

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_kanji_key" ON "Kanji"("kanji");
