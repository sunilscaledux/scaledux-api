-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "identity_verification_status" TEXT DEFAULT 'PENDING',
ADD COLUMN     "identity_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."identity_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT,
    "id_type" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "id_expiry_date" TIMESTAMP(3),
    "issuing_country" TEXT NOT NULL,
    "id_document_urls" JSONB NOT NULL,
    "selfie_urls" JSONB NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "address_country" TEXT NOT NULL,
    "proof_of_address_consent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_verifications_user_id_status_idx" ON "public"."identity_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "identity_verifications_status_idx" ON "public"."identity_verifications"("status");

-- AddForeignKey
ALTER TABLE "public"."identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
