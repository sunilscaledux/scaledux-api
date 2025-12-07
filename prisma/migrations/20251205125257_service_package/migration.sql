-- CreateTable
CREATE TABLE "public"."service_packages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "sub_category" VARCHAR(100) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "industry" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "scope" JSONB NOT NULL DEFAULT '{}',
    "deliverables" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "links" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "has_basic" BOOLEAN NOT NULL DEFAULT false,
    "has_standard" BOOLEAN NOT NULL DEFAULT false,
    "has_premium" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_package_media" (
    "id" SERIAL NOT NULL,
    "service_package_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_package_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_packages_user_id_idx" ON "public"."service_packages"("user_id");

-- CreateIndex
CREATE INDEX "service_packages_status_idx" ON "public"."service_packages"("status");

-- CreateIndex
CREATE INDEX "service_packages_category_idx" ON "public"."service_packages"("category");

-- CreateIndex
CREATE INDEX "service_package_media_service_package_id_idx" ON "public"."service_package_media"("service_package_id");

-- AddForeignKey
ALTER TABLE "public"."service_packages" ADD CONSTRAINT "service_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_package_media" ADD CONSTRAINT "service_package_media_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "public"."service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
