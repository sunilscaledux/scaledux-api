-- CreateTable
CREATE TABLE "public"."scd_team_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_team_members" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role_id" INTEGER NOT NULL,
    "bio" TEXT,
    "profile_image" TEXT,
    "linkedin_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_roles_name_key" ON "public"."scd_team_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_roles_code_key" ON "public"."scd_team_roles"("code");

-- CreateIndex
CREATE INDEX "scd_team_members_company_profile_id_idx" ON "public"."scd_team_members"("company_profile_id");

-- AddForeignKey
ALTER TABLE "public"."scd_team_members" ADD CONSTRAINT "scd_team_members_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_team_members" ADD CONSTRAINT "scd_team_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."scd_team_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
