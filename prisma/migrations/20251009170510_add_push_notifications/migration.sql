-- CreateTable
CREATE TABLE "PushToken" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_type" TEXT NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "device_platform" TEXT,
    "device_name" TEXT,
    "device_os_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_expo_push_token_key" ON "PushToken"("expo_push_token");

-- CreateIndex
CREATE INDEX "PushToken_user_id_user_type_idx" ON "PushToken"("user_id", "user_type");

-- CreateIndex
CREATE INDEX "PushToken_expo_push_token_is_active_idx" ON "PushToken"("expo_push_token", "is_active");
