/*
  Warnings:

  - You are about to drop the column `service_picture` on the `ServiceListing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ServiceListing" DROP COLUMN "service_picture";

-- CreateTable
CREATE TABLE "public"."ServicePhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "service_id" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ServicePhoto" ADD CONSTRAINT "ServicePhoto_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."ServiceListing"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;
