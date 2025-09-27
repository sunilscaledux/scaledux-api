-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "f_name" TEXT NOT NULL,
    "l_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_email_phone_idx" ON "public"."users"("email", "phone");

-- CreateIndex
CREATE INDEX "users_f_name_l_name_email_idx" ON "public"."users"("f_name", "l_name", "email");
