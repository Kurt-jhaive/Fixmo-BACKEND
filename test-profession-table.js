import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProviderProfessionTable() {
    try {
        console.log('Testing ProviderProfession table access...');
        
        // Try to query the table to see if it exists
        const count = await prisma.providerProfession.count();
        console.log('✅ ProviderProfession table exists! Current count:', count);
        
        // Try to find all records
        const professions = await prisma.providerProfession.findMany();
        console.log('Current professions in database:', professions);
        
        // Test creating a sample profession (you can delete this after testing)
        console.log('\nTesting profession creation...');
        const testProfession = await prisma.providerProfession.create({
            data: {
                provider_id: 1, // Use an existing provider ID
                profession: 'Test Profession',
                experience: 'Test Experience'
            }
        });
        console.log('✅ Test profession created:', testProfession);
        
        // Clean up test data
        await prisma.providerProfession.delete({
            where: { id: testProfession.id }
        });
        console.log('✅ Test profession deleted');
        
    } catch (error) {
        console.error('❌ Error testing ProviderProfession table:', error);
        
        if (error.code === 'P2021') {
            console.log('❌ Table does not exist in the database');
        } else if (error.message.includes('Unknown argument')) {
            console.log('❌ Prisma schema issue - field names don\'t match database');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testProviderProfessionTable();