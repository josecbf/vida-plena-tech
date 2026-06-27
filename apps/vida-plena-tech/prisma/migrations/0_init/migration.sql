-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('MEMBER', 'GC_LEADER', 'SUPERVISOR', 'COORDINATOR', 'AREA_PASTOR', 'SENIOR_PASTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EclesiasticalStatus" AS ENUM ('VISITOR', 'REGULAR_ATTENDER', 'MEMBERSHIP_INTERESTED', 'MEMBER', 'INACTIVE', 'AWAY', 'TRANSFERRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'STABLE_UNION', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('PUBLIC_FORM', 'GC_INVITE_LINK', 'ADMIN_CREATED', 'EVENT_PUBLIC', 'PROVER_IMPORT');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'FATHER', 'MOTHER', 'CHILD', 'SIBLING', 'GUARDIAN', 'DEPENDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('TENANT', 'CAMPUS', 'AREA', 'SUPERVISION', 'GC');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED', 'VISITOR');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'INTERNAL');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimelineEntryType" AS ENUM ('PERSON_CREATED', 'STATUS_CHANGED', 'GC_CHANGED', 'FAMILY_LINKED', 'EVENT_REGISTRATION', 'EVENT_REGISTRATION_CANCELLED', 'ATTENDANCE', 'PASTORAL_NOTE', 'CONSENT', 'COURSE_COMPLETION');

-- CreateEnum
CREATE TYPE "Sensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentLegalBasis" AS ENUM ('CONSENT', 'LEGITIMATE_INTEREST', 'LEGAL_OBLIGATION', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('PENDING', 'CREATED', 'MATCHED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "role" "RoleKey" NOT NULL,
    "scopeType" "ScopeType" NOT NULL DEFAULT 'TENANT',
    "scopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campusId" TEXT,
    "fullName" TEXT NOT NULL,
    "socialName" TEXT,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "sex" "Sex",
    "maritalStatus" "MaritalStatus",
    "status" "EclesiasticalStatus" NOT NULL DEFAULT 'VISITOR',
    "isBaptized" BOOLEAN NOT NULL DEFAULT false,
    "baptismDate" TIMESTAMP(3),
    "hasTD" BOOLEAN NOT NULL DEFAULT false,
    "tdDate" TIMESTAMP(3),
    "primaryGcId" TEXT,
    "operationalNotes" TEXT,
    "source" "RegistrationSource" NOT NULL DEFAULT 'ADMIN_CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fromStatus" "EclesiasticalStatus",
    "toStatus" "EclesiasticalStatus" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastoralNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PastoralNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "TimelineEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,

    CONSTRAINT "TimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" "ConsentLegalBasis" NOT NULL DEFAULT 'CONSENT',
    "consentVersion" TEXT NOT NULL DEFAULT 'v1',
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "leaderId" TEXT,
    "assistantId" TEXT,
    "supervisorId" TEXT,
    "coordinatorId" TEXT,
    "areaPastorId" TEXT,
    "weekday" INTEGER,
    "time" TEXT,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "GrowthGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthGroupMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gcId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "GrowthGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthGroupMeeting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gcId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "happened" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,

    CONSTRAINT "GrowthGroupMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthGroupAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "personId" TEXT,
    "visitorName" TEXT,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthGroupAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthGroupInviteLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gcId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthGroupInviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campusId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'MEMBERS',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorPersonId" TEXT,
    "module" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEventOutbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "DomainEventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "system" TEXT NOT NULL DEFAULT 'PROVER',
    "externalType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalType" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "system" TEXT NOT NULL DEFAULT 'PROVER',
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatchItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "externalId" TEXT,
    "rawJson" JSONB NOT NULL,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Campus_tenantId_idx" ON "Campus"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_tenantId_name_key" ON "Campus"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_personId_key" ON "TenantMembership"("personId");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "RoleAssignment_tenantId_idx" ON "RoleAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "RoleAssignment_membershipId_idx" ON "RoleAssignment"("membershipId");

-- CreateIndex
CREATE INDEX "ModuleSubscription_tenantId_idx" ON "ModuleSubscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSubscription_tenantId_moduleKey_key" ON "ModuleSubscription"("tenantId", "moduleKey");

-- CreateIndex
CREATE INDEX "Person_tenantId_idx" ON "Person"("tenantId");

-- CreateIndex
CREATE INDEX "Person_tenantId_status_idx" ON "Person"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Person_primaryGcId_idx" ON "Person"("primaryGcId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tenantId_cpf_key" ON "Person"("tenantId", "cpf");

-- CreateIndex
CREATE INDEX "ContactMethod_tenantId_idx" ON "ContactMethod"("tenantId");

-- CreateIndex
CREATE INDEX "ContactMethod_personId_idx" ON "ContactMethod"("personId");

-- CreateIndex
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");

-- CreateIndex
CREATE INDEX "Address_personId_idx" ON "Address"("personId");

-- CreateIndex
CREATE INDEX "PersonStatusHistory_tenantId_idx" ON "PersonStatusHistory"("tenantId");

-- CreateIndex
CREATE INDEX "PersonStatusHistory_personId_idx" ON "PersonStatusHistory"("personId");

-- CreateIndex
CREATE INDEX "Household_tenantId_idx" ON "Household"("tenantId");

-- CreateIndex
CREATE INDEX "HouseholdMember_tenantId_idx" ON "HouseholdMember"("tenantId");

-- CreateIndex
CREATE INDEX "HouseholdMember_personId_idx" ON "HouseholdMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_personId_key" ON "HouseholdMember"("householdId", "personId");

-- CreateIndex
CREATE INDEX "PastoralNote_tenantId_idx" ON "PastoralNote"("tenantId");

-- CreateIndex
CREATE INDEX "PastoralNote_personId_idx" ON "PastoralNote"("personId");

-- CreateIndex
CREATE INDEX "TimelineEntry_tenantId_idx" ON "TimelineEntry"("tenantId");

-- CreateIndex
CREATE INDEX "TimelineEntry_personId_idx" ON "TimelineEntry"("personId");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_idx" ON "ConsentRecord"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentRecord_personId_idx" ON "ConsentRecord"("personId");

-- CreateIndex
CREATE INDEX "GrowthGroup_tenantId_idx" ON "GrowthGroup"("tenantId");

-- CreateIndex
CREATE INDEX "GrowthGroup_leaderId_idx" ON "GrowthGroup"("leaderId");

-- CreateIndex
CREATE INDEX "GrowthGroup_supervisorId_idx" ON "GrowthGroup"("supervisorId");

-- CreateIndex
CREATE INDEX "GrowthGroupMembership_tenantId_idx" ON "GrowthGroupMembership"("tenantId");

-- CreateIndex
CREATE INDEX "GrowthGroupMembership_gcId_idx" ON "GrowthGroupMembership"("gcId");

-- CreateIndex
CREATE INDEX "GrowthGroupMembership_personId_idx" ON "GrowthGroupMembership"("personId");

-- CreateIndex
CREATE INDEX "GrowthGroupMeeting_tenantId_idx" ON "GrowthGroupMeeting"("tenantId");

-- CreateIndex
CREATE INDEX "GrowthGroupMeeting_gcId_idx" ON "GrowthGroupMeeting"("gcId");

-- CreateIndex
CREATE INDEX "GrowthGroupAttendance_tenantId_idx" ON "GrowthGroupAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "GrowthGroupAttendance_meetingId_idx" ON "GrowthGroupAttendance"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthGroupInviteLink_token_key" ON "GrowthGroupInviteLink"("token");

-- CreateIndex
CREATE INDEX "GrowthGroupInviteLink_tenantId_idx" ON "GrowthGroupInviteLink"("tenantId");

-- CreateIndex
CREATE INDEX "GrowthGroupInviteLink_gcId_idx" ON "GrowthGroupInviteLink"("gcId");

-- CreateIndex
CREATE INDEX "Event_tenantId_idx" ON "Event"("tenantId");

-- CreateIndex
CREATE INDEX "EventRegistration_tenantId_idx" ON "EventRegistration"("tenantId");

-- CreateIndex
CREATE INDEX "EventRegistration_personId_idx" ON "EventRegistration"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_personId_key" ON "EventRegistration"("eventId", "personId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_idx" ON "DomainEvent"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEvent_eventType_idx" ON "DomainEvent"("eventType");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_tenantId_idx" ON "DomainEventOutbox"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_status_idx" ON "DomainEventOutbox"("status");

-- CreateIndex
CREATE INDEX "ExternalMapping_tenantId_idx" ON "ExternalMapping"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMapping_tenantId_system_externalType_externalId_key" ON "ExternalMapping"("tenantId", "system", "externalType", "externalId");

-- CreateIndex
CREATE INDEX "ImportBatch_tenantId_idx" ON "ImportBatch"("tenantId");

-- CreateIndex
CREATE INDEX "ImportBatchItem_tenantId_idx" ON "ImportBatchItem"("tenantId");

-- CreateIndex
CREATE INDEX "ImportBatchItem_batchId_idx" ON "ImportBatchItem"("batchId");

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSubscription" ADD CONSTRAINT "ModuleSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_primaryGcId_fkey" FOREIGN KEY ("primaryGcId") REFERENCES "GrowthGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMethod" ADD CONSTRAINT "ContactMethod_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonStatusHistory" ADD CONSTRAINT "PersonStatusHistory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastoralNote" ADD CONSTRAINT "PastoralNote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEntry" ADD CONSTRAINT "TimelineEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroup" ADD CONSTRAINT "GrowthGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroup" ADD CONSTRAINT "GrowthGroup_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroup" ADD CONSTRAINT "GrowthGroup_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroup" ADD CONSTRAINT "GrowthGroup_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupMembership" ADD CONSTRAINT "GrowthGroupMembership_gcId_fkey" FOREIGN KEY ("gcId") REFERENCES "GrowthGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupMembership" ADD CONSTRAINT "GrowthGroupMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupMeeting" ADD CONSTRAINT "GrowthGroupMeeting_gcId_fkey" FOREIGN KEY ("gcId") REFERENCES "GrowthGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupAttendance" ADD CONSTRAINT "GrowthGroupAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GrowthGroupMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupAttendance" ADD CONSTRAINT "GrowthGroupAttendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthGroupInviteLink" ADD CONSTRAINT "GrowthGroupInviteLink_gcId_fkey" FOREIGN KEY ("gcId") REFERENCES "GrowthGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEventOutbox" ADD CONSTRAINT "DomainEventOutbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMapping" ADD CONSTRAINT "ExternalMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMapping" ADD CONSTRAINT "ExternalMapping_person_fkey" FOREIGN KEY ("internalId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchItem" ADD CONSTRAINT "ImportBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

