-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'TEAM', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LifecycleState" AS ENUM ('PROPOSED', 'IN_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'RETIRED');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('UNASSIGNED', 'PROHIBITED', 'HIGH', 'LIMITED', 'MINIMAL');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CrosswalkRel" AS ENUM ('EQUIVALENT', 'RELATED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'TEXT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu-central-1',
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "org_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_ip" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prev_hash" TEXT,
    "entry_hash" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_cases" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT,
    "owner_id" UUID,
    "lifecycle" "LifecycleState" NOT NULL DEFAULT 'PROPOSED',
    "risk_tier" "RiskTier" NOT NULL DEFAULT 'UNASSIGNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "model_type" TEXT,
    "version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contains_pii" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID NOT NULL,
    "questionnaire_id" UUID,
    "responses" JSONB,
    "computed_tier" "RiskTier" NOT NULL DEFAULT 'UNASSIGNED',
    "rationale" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "assessed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_mappings" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID NOT NULL,
    "control_id" UUID NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "control_mapping_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "sha256" TEXT,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "assignee_id" UUID,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID NOT NULL,
    "approver_id" UUID,
    "decision" "Decision" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "use_case_id" UUID,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "file_key" TEXT,
    "generated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworks" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_crosswalks" (
    "id" UUID NOT NULL,
    "from_control_id" UUID NOT NULL,
    "to_control_id" UUID NOT NULL,
    "relationship" "CrosswalkRel" NOT NULL DEFAULT 'RELATED',

    CONSTRAINT "control_crosswalks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "framework_id" UUID,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_SELECT',
    "options" JSONB,
    "logic" JSONB,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_org_id_user_id_key" ON "memberships"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_seq_idx" ON "audit_logs"("org_id", "seq");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_occurred_at_idx" ON "audit_logs"("org_id", "occurred_at");

-- CreateIndex
CREATE INDEX "use_cases_org_id_lifecycle_idx" ON "use_cases"("org_id", "lifecycle");

-- CreateIndex
CREATE INDEX "use_cases_org_id_risk_tier_idx" ON "use_cases"("org_id", "risk_tier");

-- CreateIndex
CREATE INDEX "ai_models_org_id_idx" ON "ai_models"("org_id");

-- CreateIndex
CREATE INDEX "datasets_org_id_idx" ON "datasets"("org_id");

-- CreateIndex
CREATE INDEX "risk_assessments_org_id_use_case_id_idx" ON "risk_assessments"("org_id", "use_case_id");

-- CreateIndex
CREATE INDEX "control_mappings_org_id_status_idx" ON "control_mappings"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "control_mappings_use_case_id_control_id_key" ON "control_mappings"("use_case_id", "control_id");

-- CreateIndex
CREATE INDEX "evidence_org_id_idx" ON "evidence"("org_id");

-- CreateIndex
CREATE INDEX "policies_org_id_status_idx" ON "policies"("org_id", "status");

-- CreateIndex
CREATE INDEX "workflows_org_id_idx" ON "workflows"("org_id");

-- CreateIndex
CREATE INDEX "tasks_org_id_status_idx" ON "tasks"("org_id", "status");

-- CreateIndex
CREATE INDEX "approvals_org_id_idx" ON "approvals"("org_id");

-- CreateIndex
CREATE INDEX "reports_org_id_idx" ON "reports"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "frameworks_key_key" ON "frameworks"("key");

-- CreateIndex
CREATE UNIQUE INDEX "controls_framework_id_code_key" ON "controls"("framework_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "control_crosswalks_from_control_id_to_control_id_key" ON "control_crosswalks"("from_control_id", "to_control_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_key_key" ON "questionnaires"("key");

-- CreateIndex
CREATE INDEX "questions_questionnaire_id_order_idx" ON "questions"("questionnaire_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "questions_questionnaire_id_key_key" ON "questions"("questionnaire_id", "key");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_control_mapping_id_fkey" FOREIGN KEY ("control_mapping_id") REFERENCES "control_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_crosswalks" ADD CONSTRAINT "control_crosswalks_from_control_id_fkey" FOREIGN KEY ("from_control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_crosswalks" ADD CONSTRAINT "control_crosswalks_to_control_id_fkey" FOREIGN KEY ("to_control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

