-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "refreshToken" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "nodeId" TEXT,
    "metricsJson" TEXT,
    "playersOnline" INTEGER NOT NULL DEFAULT 0,
    "pid" INTEGER,
    "startedAt" TIMESTAMP(3),
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
    "lastVersionCheck" TIMESTAMP(3),
    "updateInProgress" BOOLEAN NOT NULL DEFAULT false,
    "preUpdateBackupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL DEFAULT 'modtale',
    "projectId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectIconUrl" TEXT,
    "versionId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "archiveSize" INTEGER NOT NULL DEFAULT 0,
    "fileHash" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModFile" (
    "id" TEXT NOT NULL,
    "modId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "firstJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playtime" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "bannedUntil" TIMESTAMP(3),
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "isOperator" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "totalFiles" INTEGER,
    "backedUpFiles" INTEGER,
    "skippedFiles" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "remotePath" TEXT,
    "networkBackupId" TEXT,
    "automationRuleId" TEXT,
    "scheduledTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL,
    "taskData" TEXT,
    "backupLimit" INTEGER NOT NULL DEFAULT 10,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL,
    "failureMode" TEXT NOT NULL DEFAULT 'stop',
    "delayBetweenTasks" INTEGER NOT NULL DEFAULT 0,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupExecution" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "tasksTotal" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksFailed" INTEGER NOT NULL DEFAULT 0,
    "tasksSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "taskResults" TEXT,

    CONSTRAINT "TaskGroupExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsoleLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "ConsoleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMetric" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsedMB" INTEGER NOT NULL,
    "memoryTotalMB" INTEGER NOT NULL,
    "diskUsage" DOUBLE PRECISION NOT NULL,
    "diskUsedGB" DOUBLE PRECISION NOT NULL,
    "diskTotalGB" DOUBLE PRECISION NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "tps" DOUBLE PRECISION,

    CONSTRAINT "ServerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostMetric" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsedGB" DOUBLE PRECISION NOT NULL,
    "memoryTotalGB" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HostMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayed" TIMESTAMP(3),

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL,
    "conditions" TEXT,
    "actions" TEXT NOT NULL,
    "backupLimit" INTEGER NOT NULL DEFAULT 10,
    "lastTriggered" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "networkType" TEXT NOT NULL DEFAULT 'logical',
    "proxyServerId" TEXT,
    "proxyConfig" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bulkActionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerNetworkMember" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerNetworkMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkBackup" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NetworkBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionCategory" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hytale_downloader_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "binaryVersion" TEXT,
    "binaryPath" TEXT,
    "lastBinaryCheck" TIMESTAMP(3),
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "accountEmail" TEXT,
    "authenticatedAt" TIMESTAMP(3),
    "autoRefreshEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRefreshInterval" INTEGER NOT NULL DEFAULT 1800,
    "lastAutoRefresh" TIMESTAMP(3),
    "cachedVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hytale_downloader_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerUpdateHistory" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "fromVersion" TEXT NOT NULL,
    "toVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "backupId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ServerUpdateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderElection" (
    "id" TEXT NOT NULL DEFAULT 'scheduler',
    "nodeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderElection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE INDEX "Server_status_idx" ON "Server"("status");

-- CreateIndex
CREATE INDEX "Mod_serverId_idx" ON "Mod"("serverId");

-- CreateIndex
CREATE INDEX "Mod_projectId_idx" ON "Mod"("projectId");

-- CreateIndex
CREATE INDEX "Mod_providerId_idx" ON "Mod"("providerId");

-- CreateIndex
CREATE INDEX "ModFile_modId_idx" ON "ModFile"("modId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_uuid_key" ON "Player"("uuid");

-- CreateIndex
CREATE INDEX "Player_serverId_idx" ON "Player"("serverId");

-- CreateIndex
CREATE INDEX "Player_uuid_idx" ON "Player"("uuid");

-- CreateIndex
CREATE INDEX "Player_isOnline_idx" ON "Player"("isOnline");

-- CreateIndex
CREATE INDEX "Backup_serverId_idx" ON "Backup"("serverId");

-- CreateIndex
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");

-- CreateIndex
CREATE INDEX "Backup_networkBackupId_idx" ON "Backup"("networkBackupId");

-- CreateIndex
CREATE INDEX "Backup_automationRuleId_idx" ON "Backup"("automationRuleId");

-- CreateIndex
CREATE INDEX "Backup_scheduledTaskId_idx" ON "Backup"("scheduledTaskId");

-- CreateIndex
CREATE INDEX "ScheduledTask_serverId_idx" ON "ScheduledTask"("serverId");

-- CreateIndex
CREATE INDEX "ScheduledTask_enabled_idx" ON "ScheduledTask"("enabled");

-- CreateIndex
CREATE INDEX "TaskGroup_enabled_idx" ON "TaskGroup"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "TaskGroupMember_groupId_taskId_key" ON "TaskGroupMember"("groupId", "taskId");

-- CreateIndex
CREATE INDEX "TaskGroupMember_groupId_idx" ON "TaskGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "TaskGroupMember_taskId_idx" ON "TaskGroupMember"("taskId");

-- CreateIndex
CREATE INDEX "TaskGroupExecution_groupId_idx" ON "TaskGroupExecution"("groupId");

-- CreateIndex
CREATE INDEX "TaskGroupExecution_startedAt_idx" ON "TaskGroupExecution"("startedAt");

-- CreateIndex
CREATE INDEX "ConsoleLog_serverId_idx" ON "ConsoleLog"("serverId");

-- CreateIndex
CREATE INDEX "ConsoleLog_timestamp_idx" ON "ConsoleLog"("timestamp");

-- CreateIndex
CREATE INDEX "ConsoleLog_level_idx" ON "ConsoleLog"("level");

-- CreateIndex
CREATE INDEX "ServerMetric_serverId_idx" ON "ServerMetric"("serverId");

-- CreateIndex
CREATE INDEX "ServerMetric_timestamp_idx" ON "ServerMetric"("timestamp");

-- CreateIndex
CREATE INDEX "HostMetric_timestamp_idx" ON "HostMetric"("timestamp");

-- CreateIndex
CREATE INDEX "World_serverId_idx" ON "World"("serverId");

-- CreateIndex
CREATE INDEX "World_isActive_idx" ON "World"("isActive");

-- CreateIndex
CREATE INDEX "Alert_serverId_idx" ON "Alert"("serverId");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");

-- CreateIndex
CREATE INDEX "Alert_isResolved_idx" ON "Alert"("isResolved");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "AutomationRule_serverId_idx" ON "AutomationRule"("serverId");

-- CreateIndex
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");

-- CreateIndex
CREATE INDEX "AutomationRule_triggerType_idx" ON "AutomationRule"("triggerType");

-- CreateIndex
CREATE UNIQUE INDEX "ServerNetwork_name_key" ON "ServerNetwork"("name");

-- CreateIndex
CREATE INDEX "ServerNetwork_networkType_idx" ON "ServerNetwork"("networkType");

-- CreateIndex
CREATE INDEX "ServerNetwork_sortOrder_idx" ON "ServerNetwork"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ServerNetworkMember_networkId_serverId_key" ON "ServerNetworkMember"("networkId", "serverId");

-- CreateIndex
CREATE INDEX "ServerNetworkMember_networkId_idx" ON "ServerNetworkMember"("networkId");

-- CreateIndex
CREATE INDEX "ServerNetworkMember_serverId_idx" ON "ServerNetworkMember"("serverId");

-- CreateIndex
CREATE INDEX "NetworkBackup_networkId_idx" ON "NetworkBackup"("networkId");

-- CreateIndex
CREATE INDEX "NetworkBackup_createdAt_idx" ON "NetworkBackup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_key_key" ON "GlobalSetting"("key");

-- CreateIndex
CREATE INDEX "GlobalSetting_category_idx" ON "GlobalSetting"("category");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_actionCategory_idx" ON "ActivityLog"("actionCategory");

-- CreateIndex
CREATE INDEX "ActivityLog_resourceType_resourceId_idx" ON "ActivityLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_serverId_idx" ON "ServerUpdateHistory"("serverId");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_startedAt_idx" ON "ServerUpdateHistory"("startedAt");

-- CreateIndex
CREATE INDEX "ServerUpdateHistory_status_idx" ON "ServerUpdateHistory"("status");

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModFile" ADD CONSTRAINT "ModFile_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_networkBackupId_fkey" FOREIGN KEY ("networkBackupId") REFERENCES "NetworkBackup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backup" ADD CONSTRAINT "Backup_scheduledTaskId_fkey" FOREIGN KEY ("scheduledTaskId") REFERENCES "ScheduledTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupMember" ADD CONSTRAINT "TaskGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupMember" ADD CONSTRAINT "TaskGroupMember_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduledTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupExecution" ADD CONSTRAINT "TaskGroupExecution_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsoleLog" ADD CONSTRAINT "ConsoleLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMetric" ADD CONSTRAINT "ServerMetric_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "World" ADD CONSTRAINT "World_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerNetwork" ADD CONSTRAINT "ServerNetwork_proxyServerId_fkey" FOREIGN KEY ("proxyServerId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerNetworkMember" ADD CONSTRAINT "ServerNetworkMember_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ServerNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerNetworkMember" ADD CONSTRAINT "ServerNetworkMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkBackup" ADD CONSTRAINT "NetworkBackup_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ServerNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerUpdateHistory" ADD CONSTRAINT "ServerUpdateHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
