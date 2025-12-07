-- CreateTable
CREATE TABLE "public"."service_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_sub_categories" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_keywords" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_categories_is_active_idx" ON "public"."service_categories"("is_active");

-- CreateIndex
CREATE INDEX "service_sub_categories_category_id_idx" ON "public"."service_sub_categories"("category_id");

-- CreateIndex
CREATE INDEX "service_sub_categories_is_active_idx" ON "public"."service_sub_categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_sub_categories_category_id_name_key" ON "public"."service_sub_categories"("category_id", "name");

-- CreateIndex
CREATE INDEX "service_keywords_category_id_idx" ON "public"."service_keywords"("category_id");

-- CreateIndex
CREATE INDEX "service_keywords_sub_category_id_idx" ON "public"."service_keywords"("sub_category_id");

-- CreateIndex
CREATE INDEX "service_keywords_is_active_idx" ON "public"."service_keywords"("is_active");

-- CreateIndex
CREATE INDEX "service_keywords_popularity_score_idx" ON "public"."service_keywords"("popularity_score");

-- CreateIndex
CREATE INDEX "service_keywords_name_idx" ON "public"."service_keywords"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_keywords_category_id_name_key" ON "public"."service_keywords"("category_id", "name");

-- AddForeignKey
ALTER TABLE "public"."service_sub_categories" ADD CONSTRAINT "service_sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_keywords" ADD CONSTRAINT "service_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_keywords" ADD CONSTRAINT "service_keywords_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
