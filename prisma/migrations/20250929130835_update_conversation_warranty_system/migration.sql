/*
  Warnings:

  - You are about to drop the column `appointment_id` on the `Conversation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customer_id,provider_id]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_appointment_id_fkey";

-- DropIndex
DROP INDEX "public"."Conversation_appointment_id_key";

-- AlterTable
ALTER TABLE "public"."Conversation" DROP COLUMN "appointment_id",
ADD COLUMN     "warranty_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_customer_id_provider_id_key" ON "public"."Conversation"("customer_id", "provider_id");
