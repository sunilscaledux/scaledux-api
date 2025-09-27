-- CreateTable
CREATE TABLE "public"."temp_users" (
    "id" SERIAL NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temp_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "temp_users_email_key" ON "public"."temp_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "temp_users_phone_key" ON "public"."temp_users"("phone");

-- CreateIndex
CREATE INDEX "temp_users_email_phone_idx" ON "public"."temp_users"("email", "phone");

-- CreateIndex
CREATE INDEX "temp_users_LastName_FirstName_email_idx" ON "public"."temp_users"("LastName", "FirstName", "email");
