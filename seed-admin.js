import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
    try {
        console.log('🌱 Seeding admin users...\n');

        // Admin accounts to create
        const admins = [
            {
                username: 'admin',
                email: 'admin@fixmo.com',
                password: 'admin123',
                name: 'Fixmo Administrator',
                role: 'super_admin'
            },
            {
                username: 'verification',
                email: 'verification@fixmo.com',
                password: 'verify123',
                name: 'Verification Team',
                role: 'admin'
            }
        ];

        for (const adminData of admins) {
            // Check if admin already exists
            const existingAdmin = await prisma.admin.findFirst({
                where: { admin_email: adminData.email }
            });

            if (existingAdmin) {
                console.log(`✅ ${adminData.name} already exists:`, existingAdmin.admin_email);
                console.log('   Username:', existingAdmin.admin_username);
                console.log('   Name:', existingAdmin.admin_name);
                console.log('   Role:', existingAdmin.admin_role);
                console.log('');
                continue;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(adminData.password, 10);

            // Create admin user
            const admin = await prisma.admin.create({
                data: {
                    admin_username: adminData.username,
                    admin_email: adminData.email,
                    admin_password: hashedPassword,
                    admin_name: adminData.name,
                    admin_role: adminData.role,
                    is_active: true
                }
            });

            console.log(`✅ ${adminData.name} created successfully!`);
            console.log('   ID:', admin.admin_id);
            console.log('   Username:', admin.admin_username);
            console.log('   Email:', admin.admin_email);
            console.log('   Name:', admin.admin_name);
            console.log('   Role:', admin.admin_role);
            console.log('');
        }
        
        console.log('🔑 Login Credentials:');
        console.log('\n--- Super Admin ---');
        console.log('   Username: admin');
        console.log('   Email: admin@fixmo.com');
        console.log('   Password: admin123');
        
        console.log('\n--- Verification Team ---');
        console.log('   Username: verification');
        console.log('   Email: verification@fixmo.com');
        console.log('   Password: verify123');
        
        console.log('\n🌐 Access URLs:');
        console.log('   Admin Portal: http://localhost:3000/admin');
        console.log('   Direct Login: http://localhost:3000/admin-login');
        console.log('   Dashboard: http://localhost:3000/admin-dashboard');

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

seedAdmin();
