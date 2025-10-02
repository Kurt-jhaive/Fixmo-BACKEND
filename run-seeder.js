import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
    try {
        console.log('🌱 Starting super admin seeding...');

        // Check if super admin already exists
        const existingSuperAdmin = await prisma.admin.findFirst({
            where: {
                admin_email: 'super@fixmo.local'
            }
        });

        if (existingSuperAdmin) {
            console.log('✅ Super admin already exists. Skipping seeding.');
            return;
        }

        // Hash the temporary password
        const saltRounds = 12;
        const tempPassword = 'SuperAdmin2024!';
        const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

        // Create super admin
        const superAdmin = await prisma.admin.create({
            data: {
                admin_username: 'superadmin',
                admin_email: 'super@fixmo.local',
                admin_password: hashedPassword,
                admin_name: 'Super Administrator',
                admin_role: 'super_admin',
                is_active: true,
                must_change_password: true,
                created_at: new Date()
            }
        });

        console.log('✅ Super admin created successfully!');
        console.log('📧 Email: super@fixmo.local');
        console.log('🔑 Temporary Password: SuperAdmin2024!');
        console.log('⚠️ Please change this password on first login!');
        console.log('🆔 Admin ID:', superAdmin.admin_id);

    } catch (error) {
        console.error('❌ Error seeding super admin:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder
seedSuperAdmin()
    .then(() => {
        console.log('🎉 Super admin seeding completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Super admin seeding failed:', error);
        process.exit(1);
    });
