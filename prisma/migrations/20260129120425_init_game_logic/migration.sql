-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentCard" TEXT,
    "direction" INTEGER NOT NULL DEFAULT 1,
    "turnIndex" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hand" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
