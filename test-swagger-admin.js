// Simple test to verify swagger documentation includes admin endpoints
import { specs } from './src/config/swagger.js';

function testSwaggerDocumentation() {
    try {
        console.log('🧪 Testing Swagger Documentation...\n');
        
        // Check if admin paths are included
        const paths = specs.paths || {};
        const adminPaths = Object.keys(paths).filter(path => path.includes('/admin'));
        
        console.log('📋 Found Admin Paths:');
        adminPaths.forEach(path => {
            const methods = Object.keys(paths[path]);
            console.log(`  ${path} (${methods.join(', ').toUpperCase()})`);
        });
        
        // Check if admin schemas are included
        const schemas = specs.components?.schemas || {};
        const adminSchemas = Object.keys(schemas).filter(schema => 
            schema.includes('Admin') || schema.includes('admin')
        );
        
        console.log('\n📋 Found Admin Schemas:');
        adminSchemas.forEach(schema => {
            console.log(`  ${schema}`);
        });
        
        // Check specific admin endpoints
        const expectedPaths = [
            '/api/admin/login',
            '/api/admin/logout',
            '/api/admin/change-password',
            '/api/admin/',
            '/api/admin/{admin_id}/toggle-status'
        ];
        
        console.log('\n✅ Expected Admin Endpoints:');
        expectedPaths.forEach(expectedPath => {
            const found = adminPaths.some(path => 
                path === expectedPath || path.replace('{admin_id}', '{admin_id}') === expectedPath
            );
            console.log(`  ${expectedPath}: ${found ? '✅ Found' : '❌ Missing'}`);
        });
        
        // Check if admin authentication is properly documented
        const loginPath = paths['/api/admin/login'];
        if (loginPath?.post) {
            console.log('\n🔐 Login Endpoint Check:');
            console.log(`  Has POST method: ✅`);
            console.log(`  Has request body: ${loginPath.post.requestBody ? '✅' : '❌'}`);
            console.log(`  Has responses: ${loginPath.post.responses ? '✅' : '❌'}`);
            console.log(`  Has tags: ${loginPath.post.tags ? '✅' : '❌'}`);
        }
        
        console.log('\n🎉 Swagger documentation test completed!');
        
    } catch (error) {
        console.error('❌ Error testing swagger documentation:', error.message);
    }
}

testSwaggerDocumentation();
