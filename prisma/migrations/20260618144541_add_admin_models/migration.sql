-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'FINANCE', 'SUPPORT');

-- CreateTable
CREATE TABLE "scd_admins" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "permissions" JSONB,
    "avatar_url" TEXT,
    "phone" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_admin_sessions" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_admin_audit_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_admins_unique_id_key" ON "scd_admins"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_admins_email_key" ON "scd_admins"("email");

-- CreateIndex
CREATE INDEX "scd_admins_role_idx" ON "scd_admins"("role");

-- CreateIndex
CREATE INDEX "scd_admins_status_idx" ON "scd_admins"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_admin_sessions_token_hash_key" ON "scd_admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "scd_admin_sessions_admin_id_idx" ON "scd_admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "scd_admin_audit_logs_admin_id_idx" ON "scd_admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "scd_admin_audit_logs_entity_type_entity_id_idx" ON "scd_admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "scd_admin_audit_logs_action_idx" ON "scd_admin_audit_logs"("action");

-- AddForeignKey
ALTER TABLE "scd_admin_sessions" ADD CONSTRAINT "scd_admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "scd_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_admin_audit_logs" ADD CONSTRAINT "scd_admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "scd_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
