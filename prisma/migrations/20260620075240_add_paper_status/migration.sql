-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Paper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "extractedText" TEXT,
    "structure" TEXT,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "finalSummary" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Paper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Paper" ("authors", "createdAt", "extractedText", "fileName", "fileSize", "fileUrl", "id", "pageCount", "structure", "title", "updatedAt", "userId") SELECT "authors", "createdAt", "extractedText", "fileName", "fileSize", "fileUrl", "id", "pageCount", "structure", "title", "updatedAt", "userId" FROM "Paper";
DROP TABLE "Paper";
ALTER TABLE "new_Paper" RENAME TO "Paper";
CREATE INDEX "Paper_userId_idx" ON "Paper"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
