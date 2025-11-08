/*
  Warnings:

  - The `admin_role` column on the `Admin` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'operations', 'verification');

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "admin_role",
ADD COLUMN     "admin_role" "AdminRole" NOT NULL DEFAULT 'admin';
