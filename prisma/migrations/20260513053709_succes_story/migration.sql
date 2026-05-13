-- CreateTable
CREATE TABLE "scd_success_stories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(900),
    "date" DATE,
    "organisation_name" VARCHAR(255) NOT NULL,
    "client_name" VARCHAR(255),
    "linkedin_link" VARCHAR(500),
    "media_files" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_success_stories_user_id_idx" ON "scd_success_stories"("user_id");

-- AddForeignKey
ALTER TABLE "scd_success_stories" ADD CONSTRAINT "scd_success_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
