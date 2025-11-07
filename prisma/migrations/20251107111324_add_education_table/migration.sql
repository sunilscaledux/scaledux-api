-- CreateTable
CREATE TABLE "public"."education" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "area_of_study" TEXT NOT NULL,
    "start_month" TEXT NOT NULL,
    "start_year" TEXT NOT NULL,
    "end_month" TEXT,
    "end_year" TEXT,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."education" ADD CONSTRAINT "education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
