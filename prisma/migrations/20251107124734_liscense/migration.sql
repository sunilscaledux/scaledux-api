-- CreateTable
CREATE TABLE "public"."licenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "institute" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "completed_month" TEXT NOT NULL,
    "completed_year" TEXT NOT NULL,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."licenses" ADD CONSTRAINT "licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
