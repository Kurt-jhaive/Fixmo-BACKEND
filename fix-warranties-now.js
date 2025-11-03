import { autoCompleteExpiredWarranties } from './src/services/conversationWarrantyService.js';

async function runManualFix() {
    try {
        console.log('🔧 Manually triggering warranty auto-completion...');
        console.log('');
        
        const result = await autoCompleteExpiredWarranties();
        
        console.log('');
        console.log('✅ Manual fix completed!');
        console.log(`   Appointments auto-completed: ${result.length}`);
        
        if (result.length > 0) {
            console.log('   IDs:', result.map(a => a.appointment_id).join(', '));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

runManualFix();
