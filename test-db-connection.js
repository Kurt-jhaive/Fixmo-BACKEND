// Simple test to verify the seeder works
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const adminCount = await prisma.admin.count();
        console.log('Current admin count:', adminCount);
        
        const admins = await prisma.admin.findMany({
            select: {
                admin_id: true,
                admin_email: true,
                admin_role: true,
                is_active: true
            }
        });
        
        console.log('Existing admins:', admins);
    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
