-- CreateTable
CREATE TABLE "public"."scd_upload_files" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNATTACH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_payment_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "payment_type" VARCHAR(20) NOT NULL,
    "encrypted_card_number" TEXT,
    "last_four_digits" VARCHAR(4),
    "card_holder_name" VARCHAR(100),
    "expiry_date" VARCHAR(5),
    "billing_address" JSONB,
    "paypal_email" VARCHAR(255),
    "paypal_account_id" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_tax_information" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tax_residence" JSONB NOT NULL,
    "has_gstin" BOOLEAN NOT NULL DEFAULT false,
    "gstin" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_tax_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_billing_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "invoice_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_upload_files_created_at_idx" ON "public"."scd_upload_files"("created_at");

-- CreateIndex
CREATE INDEX "scd_upload_files_mime_type_idx" ON "public"."scd_upload_files"("mime_type");

-- CreateIndex
CREATE INDEX "scd_upload_files_mime_type_path_idx" ON "public"."scd_upload_files"("mime_type", "path");

-- CreateIndex
CREATE INDEX "scd_payment_methods_user_id_idx" ON "public"."scd_payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "scd_payment_methods_payment_type_idx" ON "public"."scd_payment_methods"("payment_type");

-- CreateIndex
CREATE INDEX "scd_payment_methods_is_default_idx" ON "public"."scd_payment_methods"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "scd_tax_information_user_id_key" ON "public"."scd_tax_information"("user_id");

-- CreateIndex
CREATE INDEX "scd_tax_information_user_id_idx" ON "public"."scd_tax_information"("user_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_user_id_idx" ON "public"."scd_billing_transactions"("user_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_status_idx" ON "public"."scd_billing_transactions"("status");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_created_at_idx" ON "public"."scd_billing_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "public"."scd_payment_methods" ADD CONSTRAINT "scd_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_tax_information" ADD CONSTRAINT "scd_tax_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
