-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL,
    "failureMode" TEXT NOT NULL DEFAULT 'stop',
    "delayBetweenTasks" INTEGER NOT NULL DEFAULT 0,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskGroupMember_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduledTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskGroupExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "tasksTotal" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksFailed" INTEGER NOT NULL DEFAULT 0,
    "tasksSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "taskResults" TEXT,
    CONSTRAINT "TaskGroupExecution_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServerUpdateHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "fromVersion" TEXT NOT NULL,
    "toVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "backupId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ServerUpdateHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "pid" INTEGER,
    "startedAt" DATETIME,
    "rconPort" INTEGER,
    "rconPassword" TEXT,
    "logFilePath" TEXT,
    "serverPath" TEXT NOT NULL,
    "worldPath" TEXT NOT NULL,
    "backupPath" TEXT,
    "backupType" TEXT NOT NULL DEFAULT 'local',
    "backupExclusions" TEXT,
    "adapterType" TEXT NOT NULL DEFAULT 'java',
    "adapterConfig" TEXT,
    "jvmArgs" TEXT,
    "serverArgs" TEXT,
    "availableVersion" TEXT,
    "lastVersionCheck" DATETIME,
    "updateInProgress" BOOLEAN NOT NULL DEFAULT false,
    "preUpdateBackupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("adapterConfig", "adapterType", "address", "backupExclusions", "backupPath", "backupType", "createdAt", "gameMode", "id", "jvmArgs", "logFilePath", "maxPlayers", "name", "pid", "port", "rconPassword", "rconPort", "serverArgs", "serverPath", "startedAt", "status", "updatedAt", "version", "worldPath") SELECT "adapterConfig", "adapterType", "address", "backupExclusions", "backupPath", "backupType", "createdAt", "gameMode", "id", "jvmArgs", "logFilePath", "maxPlayers", "name", "pid", "port", "rconPassword", "rconPort", "serverArgs", "serverPath", "startedAt", "status", "updatedAt", "version", "worldPath" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TaskGroup_enabled_idx" ON "TaskGroup"("enabled");

-- CreateIndex
CREATE INDEX "TaskGroupMember_groupId_idx" ON "TaskGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "TaskGroupMember_taskId_idx" ON "TaskGroupMember"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskGroupMember_groupId_taskId_key" ON "TaskGroupMember"("groupId", "taskId");

-- CreateIndex
CREATE INDEX "TaskGroupExecution_groupId_idx" ON "TaskGroupExecution"("groupId");

-- CreateIndex
CREATE INDEX "TaskGroupExecution_startedAt_idx" ON "TaskGroupExecution"("startedAt");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_serverId_idx" ON "ServerUpdateHistory"("serverId");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_startedAt_idx" ON "ServerUpdateHistory"("startedAt");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_status_idx" ON "ServerUpdateHistory"("status");
