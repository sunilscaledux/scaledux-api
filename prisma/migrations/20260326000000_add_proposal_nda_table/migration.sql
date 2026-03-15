-- CreateTable
CREATE TABLE "scd_proposal_ndas" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "offer_expires_at" TIMESTAMPTZ,
    "is_nda_signed" BOOLEAN NOT NULL DEFAULT false,
    "nda_file_link" VARCHAR(512),
    "nda_sent_at" TIMESTAMPTZ,
    "nda_signed_at" TIMESTAMPTZ,
    "nda_signed_file_link" VARCHAR(512),
    "nda_downloaded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_proposal_ndas_pkey" PRIMARY KEY ("id")
);

-- Migrate existing nda JSON from scd_proposals into scd_proposal_ndas
INSERT INTO "scd_proposal_ndas" (
    "proposal_id",
    "offer_expires_at",
    "is_nda_signed",
    "nda_file_link",
    "nda_sent_at",
    "nda_signed_at",
    "nda_signed_file_link",
    "nda_downloaded_at",
    "created_at",
    "updated_at"
)
SELECT
    p.id,
    CASE WHEN p.nda->>'offer_expires_at' IS NOT NULL AND p.nda->>'offer_expires_at' != '' THEN (p.nda->>'offer_expires_at')::timestamptz ELSE NULL END,
    COALESCE((p.nda->>'is_nda_signed')::boolean, false),
    NULLIF(TRIM(p.nda->>'nda_file_link'), ''),
    CASE WHEN p.nda->>'nda_sent_at' IS NOT NULL AND p.nda->>'nda_sent_at' != '' THEN (p.nda->>'nda_sent_at')::timestamptz ELSE NULL END,
    CASE WHEN p.nda->>'nda_signed_at' IS NOT NULL AND p.nda->>'nda_signed_at' != '' THEN (p.nda->>'nda_signed_at')::timestamptz ELSE NULL END,
    NULLIF(TRIM(p.nda->>'nda_signed_file_link'), ''),
    CASE WHEN p.nda->>'nda_downloaded_at' IS NOT NULL AND p.nda->>'nda_downloaded_at' != '' THEN (p.nda->>'nda_downloaded_at')::timestamptz ELSE NULL END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "scd_proposals" p
WHERE p.nda IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposal_ndas_proposal_id_key" ON "scd_proposal_ndas"("proposal_id");

-- AddForeignKey
ALTER TABLE "scd_proposal_ndas" ADD CONSTRAINT "scd_proposal_ndas_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "scd_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "scd_proposals" DROP COLUMN "nda";
