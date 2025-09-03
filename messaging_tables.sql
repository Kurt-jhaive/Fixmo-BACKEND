-- SQL Commands for Supabase - Messaging System Tables
-- Run these commands in your Supabase SQL Editor

-- 1. Create Conversations Table
CREATE TABLE "Conversation" (
    "conversation_id" SERIAL PRIMARY KEY,
    "appointment_id" INTEGER UNIQUE NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "status" TEXT DEFAULT 'active' NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Create Messages Table
CREATE TABLE "Message" (
    "message_id" SERIAL PRIMARY KEY,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_type" TEXT NOT NULL,
    "message_type" TEXT DEFAULT 'text' NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "is_read" BOOLEAN DEFAULT false NOT NULL,
    "is_edited" BOOLEAN DEFAULT false NOT NULL,
    "edited_at" TIMESTAMP(3),
    "replied_to_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Add Foreign Key Constraints
ALTER TABLE "Conversation" 
ADD CONSTRAINT "Conversation_appointment_id_fkey" 
FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conversation" 
ADD CONSTRAINT "Conversation_customer_id_fkey" 
FOREIGN KEY ("customer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conversation" 
ADD CONSTRAINT "Conversation_provider_id_fkey" 
FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message" 
ADD CONSTRAINT "Message_conversation_id_fkey" 
FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("conversation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message" 
ADD CONSTRAINT "Message_replied_to_id_fkey" 
FOREIGN KEY ("replied_to_id") REFERENCES "Message"("message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create Indexes for Better Performance
CREATE INDEX "Conversation_appointment_id_key" ON "Conversation"("appointment_id");
CREATE INDEX "Conversation_customer_id_idx" ON "Conversation"("customer_id");
CREATE INDEX "Conversation_provider_id_idx" ON "Conversation"("provider_id");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");
CREATE INDEX "Message_sender_id_idx" ON "Message"("sender_id");
CREATE INDEX "Message_created_at_idx" ON "Message"("created_at");
CREATE INDEX "Message_is_read_idx" ON "Message"("is_read");

-- 5. Add Triggers for Updated_at Fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_updated_at 
BEFORE UPDATE ON "Conversation" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_updated_at 
BEFORE UPDATE ON "Message" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Add Check Constraints
ALTER TABLE "Conversation" 
ADD CONSTRAINT "Conversation_status_check" 
CHECK ("status" IN ('active', 'archived', 'closed'));

ALTER TABLE "Message" 
ADD CONSTRAINT "Message_sender_type_check" 
CHECK ("sender_type" IN ('customer', 'provider'));

ALTER TABLE "Message" 
ADD CONSTRAINT "Message_message_type_check" 
CHECK ("message_type" IN ('text', 'image', 'file', 'location'));

-- 7. Enable Row Level Security (RLS) for Privacy
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
-- Conversation policies
CREATE POLICY "Users can view their own conversations" ON "Conversation"
FOR SELECT USING (
    auth.uid()::text = customer_id::text OR 
    auth.uid()::text = provider_id::text
);

CREATE POLICY "Users can update their own conversations" ON "Conversation"
FOR UPDATE USING (
    auth.uid()::text = customer_id::text OR 
    auth.uid()::text = provider_id::text
);

-- Message policies
CREATE POLICY "Users can view messages in their conversations" ON "Message"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Conversation" 
        WHERE "Conversation"."conversation_id" = "Message"."conversation_id"
        AND (
            auth.uid()::text = "Conversation"."customer_id"::text OR 
            auth.uid()::text = "Conversation"."provider_id"::text
        )
    )
);

CREATE POLICY "Users can insert messages in their conversations" ON "Message"
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Conversation" 
        WHERE "Conversation"."conversation_id" = "Message"."conversation_id"
        AND (
            auth.uid()::text = "Conversation"."customer_id"::text OR 
            auth.uid()::text = "Conversation"."provider_id"::text
        )
    )
);

CREATE POLICY "Users can update their own messages" ON "Message"
FOR UPDATE USING (
    auth.uid()::text = sender_id::text
);

-- 9. Create View for Message Analytics
CREATE VIEW message_analytics AS
SELECT 
    c.conversation_id,
    c.appointment_id,
    c.customer_id,
    c.provider_id,
    COUNT(m.message_id) as total_messages,
    COUNT(CASE WHEN m.sender_type = 'customer' THEN 1 END) as customer_messages,
    COUNT(CASE WHEN m.sender_type = 'provider' THEN 1 END) as provider_messages,
    COUNT(CASE WHEN m.is_read = false THEN 1 END) as unread_messages,
    MAX(m.created_at) as last_message_time
FROM "Conversation" c
LEFT JOIN "Message" m ON c.conversation_id = m.conversation_id
GROUP BY c.conversation_id, c.appointment_id, c.customer_id, c.provider_id;

-- 10. Create Function to Auto-create Conversation on Appointment
CREATE OR REPLACE FUNCTION create_conversation_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create conversation for confirmed appointments
    IF NEW.appointment_status = 'confirmed' THEN
        INSERT INTO "Conversation" (appointment_id, customer_id, provider_id)
        VALUES (NEW.appointment_id, NEW.customer_id, NEW.provider_id)
        ON CONFLICT (appointment_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create conversations
CREATE TRIGGER auto_create_conversation
AFTER INSERT OR UPDATE ON "Appointment"
FOR EACH ROW
EXECUTE FUNCTION create_conversation_on_appointment();

-- 11. Create Function to Update Last Message Time
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Conversation" 
    SET last_message_at = NEW.created_at 
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last message time
CREATE TRIGGER update_last_message_time
AFTER INSERT ON "Message"
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();
