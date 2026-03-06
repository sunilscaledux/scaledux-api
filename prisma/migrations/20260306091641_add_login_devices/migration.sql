-- CreateTable
CREATE TABLE "public"."scd_login_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" VARCHAR(512) NOT NULL,
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50),
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_login_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_login_devices_refresh_token_key" ON "public"."scd_login_devices"("refresh_token");

-- CreateIndex
CREATE INDEX "scd_login_devices_user_id_idx" ON "public"."scd_login_devices"("user_id");

-- CreateIndex
CREATE INDEX "scd_login_devices_refresh_token_idx" ON "public"."scd_login_devices"("refresh_token");

-- AddForeignKey
ALTER TABLE "public"."scd_login_devices" ADD CONSTRAINT "scd_login_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
