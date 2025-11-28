-- CreateTable
CREATE TABLE "public"."portfolios" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "hide_company_name" BOOLEAN NOT NULL DEFAULT false,
    "industry" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "project_skills" JSONB NOT NULL,
    "tools_used" JSONB NOT NULL,
    "thumbnail_urls" JSONB,
    "media_urls" JSONB,
    "project_link" TEXT,
    "completion_month" TEXT NOT NULL,
    "completion_year" TEXT NOT NULL,
    "references" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolios_user_id_status_idx" ON "public"."portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "portfolios_status_idx" ON "public"."portfolios"("status");

-- AddForeignKey
ALTER TABLE "public"."portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
