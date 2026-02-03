-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "deck" TEXT NOT NULL DEFAULT '[]',
    "discardPile" TEXT NOT NULL DEFAULT '[]',
    "currentCard" TEXT,
    "direction" INTEGER NOT NULL DEFAULT 1,
    "turnIndex" INTEGER NOT NULL DEFAULT 0,
    "pendingPenalty" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "chloppedPlayerIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Game" ("createdAt", "currentCard", "deck", "direction", "discardPile", "id", "status", "turnIndex", "winnerId") SELECT "createdAt", "currentCard", "deck", "direction", "discardPile", "id", "status", "turnIndex", "winnerId" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
