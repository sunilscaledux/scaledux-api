-- CreateTable
CREATE TABLE "scd_constants" (
    "id" SERIAL NOT NULL,
    "group" VARCHAR(64) NOT NULL,
    "subkey" VARCHAR(64) NOT NULL DEFAULT '',
    "value" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255),
    "description" TEXT,
    "code" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_constants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_constants_group_subkey_is_active_idx" ON "scd_constants"("group", "subkey", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "scd_constants_group_subkey_value_key" ON "scd_constants"("group", "subkey", "value");
