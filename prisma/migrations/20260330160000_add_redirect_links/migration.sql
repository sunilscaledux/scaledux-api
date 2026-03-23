-- CreateTable
CREATE TABLE "scd_redirect_links" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "created_by" INTEGER,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_redirect_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_redirect_links_code_key" ON "scd_redirect_links"("code");

-- CreateIndex
CREATE INDEX "scd_redirect_links_code_idx" ON "scd_redirect_links"("code");

-- CreateIndex
CREATE INDEX "scd_redirect_links_entity_type_entity_id_idx" ON "scd_redirect_links"("entity_type", "entity_id");
