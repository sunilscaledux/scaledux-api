-- CreateTable
CREATE TABLE "scd_connections" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_connections_receiver_id_status_idx" ON "scd_connections"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "scd_connections_sender_id_status_idx" ON "scd_connections"("sender_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_connections_sender_id_receiver_id_key" ON "scd_connections"("sender_id", "receiver_id");

-- AddForeignKey
ALTER TABLE "scd_connections" ADD CONSTRAINT "scd_connections_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_connections" ADD CONSTRAINT "scd_connections_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
