-- CreateTable
CREATE TABLE "public"."ProviderProfession" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "profession" TEXT NOT NULL,
    "experience" TEXT NOT NULL,

    CONSTRAINT "ProviderProfession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfession_provider_id_profession_key" ON "public"."ProviderProfession"("provider_id", "profession");

-- AddForeignKey
ALTER TABLE "public"."ProviderProfession" ADD CONSTRAINT "ProviderProfession_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;
