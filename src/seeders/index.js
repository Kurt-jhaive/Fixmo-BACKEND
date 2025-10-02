import seedSuperAdmin from './seedSuperAdmin.js';

/**
 * Main seeder function that runs all necessary seeders
 * This should be called on first deployment/migration
 */
async function runAllSeeders() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Run super admin seeder
        await seedSuperAdmin();
        
        console.log('✅ All seeders completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllSeeders()
        .then(() => {
            console.log('🎉 Database seeding completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database seeding failed:', error);
            process.exit(1);
        });
}

export default runAllSeeders;
