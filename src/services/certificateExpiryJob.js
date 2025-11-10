import cron from 'node-cron';
import prisma from '../prismaclient.js';
import { sendEmail } from './mailer.js';
import notificationService from './notificationService.js';

/**
 * Check and mark expired certificates
 * Runs daily at midnight
 * 
 * Job Logic:
 * 1. Find expired certificates (expiry_date <= now AND status = 'Approved')
 * 2. For each expired certificate, in a transaction:
 *    a. Update certificate status to 'Expired'
 *    b. Find all CoveredService records linked to the certificate
 *    c. Find all SpecificService records from those CoveredServices
 *    d. Find all ServiceListing records that are still active
 *    e. Deactivate those ServiceListings
 */
const checkExpiredCertificates = async () => {
    try {
        console.log('🔍 Checking for expired certificates...');
        
        const now = new Date();
        
        // Step 1: Find Expired Certificates
        // Query for certificates where expiry_date is in the past AND status is 'Approved'
        const expiredCertificates = await prisma.certificate.findMany({
            where: {
                expiry_date: {
                    lte: now  // Less than or equal to current time
                },
                certificate_status: 'Approved'  // Only process Approved certificates
            },
            include: {
                provider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                }
            }
        });

        // If no expired certificates found, job finishes
        if (expiredCertificates.length === 0) {
            console.log('✅ No expired certificates found.');
            return { updated: 0, certificates: [], deactivatedServices: 0 };
        }

        console.log(`📋 Found ${expiredCertificates.length} expired certificate(s).`);
        console.log(`   Certificate IDs: ${expiredCertificates.map(c => c.certificate_id).join(', ')}`);

        let totalDeactivatedServices = 0;

        // Step 2: Loop Through Expired Certificates
        for (const expiredCert of expiredCertificates) {
            try {
                console.log(`\n🔄 Processing certificate ID ${expiredCert.certificate_id}: ${expiredCert.certificate_name}`);

                // Perform all actions in a transaction
                const result = await prisma.$transaction(async (tx) => {
                    // Transaction Step 1: Update Certificate Status to 'Expired'
                    await tx.certificate.update({
                        where: { certificate_id: expiredCert.certificate_id },
                        data: { certificate_status: 'Expired' }
                    });
                    console.log(`   ✓ Certificate ${expiredCert.certificate_id} marked as Expired`);

                    // Transaction Step 2: Find All Linked Services
                    // Find all CoveredService records matching this certificate_id
                    const coveredServices = await tx.coveredService.findMany({
                        where: { certificate_id: expiredCert.certificate_id },
                        select: { specific_service_id: true }
                    });

                    if (coveredServices.length === 0) {
                        console.log(`   ℹ️  No linked services found for certificate ${expiredCert.certificate_id}`);
                        return { deactivatedCount: 0 };
                    }

                    // Collect the list of specific_service_ids
                    const specificServiceIds = coveredServices.map(cs => cs.specific_service_id);
                    console.log(`   ✓ Found ${specificServiceIds.length} linked specific service(s)`);

                    // Transaction Step 3: Find All Parent Service Listings
                    // Find all SpecificService records where specific_service_id is in the list
                    const specificServices = await tx.specificService.findMany({
                        where: { specific_service_id: { in: specificServiceIds } },
                        select: { service_id: true }
                    });

                    // Collect unique list of service_ids
                    const serviceIds = [...new Set(specificServices.map(ss => ss.service_id))];
                    
                    if (serviceIds.length === 0) {
                        console.log(`   ℹ️  No parent service listings found`);
                        return { deactivatedCount: 0 };
                    }

                    console.log(`   ✓ Found ${serviceIds.length} parent service listing(s)`);

                    // Transaction Step 4: Deactivate Active Service Listings
                    // Find and update all ServiceListings where service_id is in the list
                    // AND servicelisting_isActive is true
                    const deactivateResult = await tx.serviceListing.updateMany({
                        where: {
                            service_id: { in: serviceIds },
                            servicelisting_isActive: true  // Only deactivate active ones
                        },
                        data: { servicelisting_isActive: false }
                    });

                    console.log(`   🚫 Deactivated ${deactivateResult.count} active service listing(s)`);

                    return { deactivatedCount: deactivateResult.count };
                });

                totalDeactivatedServices += result.deactivatedCount;

            } catch (certError) {
                console.error(`❌ Error processing certificate ${expiredCert.certificate_id}:`, certError);
                // Continue with next certificate even if one fails
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Processed ${expiredCertificates.length} expired certificate(s)`);
        console.log(`   🚫 Deactivated ${totalDeactivatedServices} service listing(s) in total`);

        // Group expired certificates by provider for notifications
        const providerCertificates = {};
        expiredCertificates.forEach(cert => {
            if (!providerCertificates[cert.provider_id]) {
                providerCertificates[cert.provider_id] = {
                    provider: cert.provider,
                    certificates: []
                };
            }
            providerCertificates[cert.provider_id].certificates.push(cert);
        });

        // Send notifications to each affected provider
        console.log(`\n📧 Sending notifications to ${Object.keys(providerCertificates).length} provider(s)...`);
        for (const [providerId, data] of Object.entries(providerCertificates)) {
            const { provider, certificates } = data;
            
            // Send email notification
            try {
                await sendCertificateExpiryEmail(provider, certificates);
            } catch (emailError) {
                console.error(`❌ Failed to send email to provider ${providerId}:`, emailError);
            }

            // Send push notification
            try {
                await sendCertificateExpiryPushNotification(parseInt(providerId), certificates);
            } catch (pushError) {
                console.error(`❌ Failed to send push notification to provider ${providerId}:`, pushError);
            }
        }

        console.log(`✅ Certificate expiry job completed successfully.`);
        
        return {
            updated: expiredCertificates.length,
            certificates: expiredCertificates,
            deactivatedServices: totalDeactivatedServices
        };

    } catch (error) {
        console.error('❌ Error checking expired certificates:', error);
        throw error;
    }
};

/**
 * Check for certificates expiring soon (within 30 days)
 * Send reminder notifications
 */
const checkExpiringCertificates = async () => {
    try {
        console.log('🔍 Checking for expiring certificates (within 30 days)...');
        
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        // Find certificates expiring within 30 days
        const expiringCertificates = await prisma.certificate.findMany({
            where: {
                expiry_date: {
                    gt: now,
                    lte: thirtyDaysFromNow
                },
                certificate_status: 'Approved'
            },
            include: {
                provider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true
                    }
                }
            }
        });

        if (expiringCertificates.length === 0) {
            console.log('✅ No certificates expiring within 30 days.');
            return { notified: 0, certificates: [] };
        }

        console.log(`📋 Found ${expiringCertificates.length} certificate(s) expiring within 30 days.`);

        // Group by provider
        const providerCertificates = {};
        expiringCertificates.forEach(cert => {
            if (!providerCertificates[cert.provider_id]) {
                providerCertificates[cert.provider_id] = {
                    provider: cert.provider,
                    certificates: []
                };
            }
            providerCertificates[cert.provider_id].certificates.push(cert);
        });

        // Send reminder notifications
        for (const [providerId, data] of Object.entries(providerCertificates)) {
            const { provider, certificates } = data;
            
            try {
                await sendCertificateExpiryReminderEmail(provider, certificates);
                await sendCertificateExpiryReminderPushNotification(parseInt(providerId), certificates);
            } catch (error) {
                console.error(`❌ Failed to send reminders to provider ${providerId}:`, error);
            }
        }

        console.log(`✅ Sent expiry reminders for ${expiringCertificates.length} certificate(s).`);
        
        return {
            notified: expiringCertificates.length,
            certificates: expiringCertificates
        };

    } catch (error) {
        console.error('❌ Error checking expiring certificates:', error);
        throw error;
    }
};

/**
 * Send email notification for expired certificates
 */
const sendCertificateExpiryEmail = async (provider, certificates) => {
    const certificateList = certificates.map(cert => `
        <li>
            <strong>${cert.certificate_name}</strong><br>
            Certificate #: ${cert.certificate_number}<br>
            Expired: ${new Date(cert.expiry_date).toLocaleDateString()}
        </li>
    `).join('');

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #d32f2f; margin-top: 0;">⚠️ Certificate(s) Expired</h2>
                
                <p>Dear ${provider.provider_first_name} ${provider.provider_last_name},</p>
                
                <p>We're writing to inform you that ${certificates.length} of your certificate(s) ${certificates.length > 1 ? 'have' : 'has'} expired and ${certificates.length > 1 ? 'have' : 'has'} been marked as <strong>Expired</strong> in our system.</p>
                
                <div style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #d32f2f;">Expired Certificates:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${certificateList}
                    </ul>
                </div>
                
                <h3 style="color: #333;">What This Means:</h3>
                <ul style="line-height: 1.6;">
                    <li>Your expired certificates are no longer valid</li>
                    <li><strong>Service listings using these certificates have been automatically deactivated</strong></li>
                    <li>You need to renew or upload new certificates to reactivate your services</li>
                </ul>
                
                <h3 style="color: #333;">Action Required:</h3>
                <ol style="line-height: 1.6;">
                    <li>Renew your expired certificate(s)</li>
                    <li>Upload the new certificate(s) through your provider dashboard</li>
                    <li>Wait for admin approval</li>
                    <li>Reactivate your service listings once certificates are approved</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://fixmo.com/provider/certificates" 
                       style="display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Upload New Certificates
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    If you have any questions, please contact our support team.
                </p>
            </div>
        </div>
    `;

    await sendEmail({
        to: provider.provider_email,
        subject: `⚠️ Certificate Expiry Alert - Action Required`,
        html: emailHtml
    });

    console.log(`📧 Expiry email sent to ${provider.provider_email}`);
};

/**
 * Send email reminder for certificates expiring soon
 */
const sendCertificateExpiryReminderEmail = async (provider, certificates) => {
    const certificateList = certificates.map(cert => {
        const daysUntilExpiry = Math.ceil((new Date(cert.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        return `
            <li>
                <strong>${cert.certificate_name}</strong><br>
                Certificate #: ${cert.certificate_number}<br>
                Expires: ${new Date(cert.expiry_date).toLocaleDateString()} 
                <span style="color: ${daysUntilExpiry <= 7 ? '#d32f2f' : '#ff9800'};">(${daysUntilExpiry} days remaining)</span>
            </li>
        `;
    }).join('');

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #ff9800; margin-top: 0;">⏰ Certificate Expiry Reminder</h2>
                
                <p>Dear ${provider.provider_first_name} ${provider.provider_last_name},</p>
                
                <p>This is a friendly reminder that ${certificates.length} of your certificate(s) will expire within the next 30 days.</p>
                
                <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #ff9800;">Certificates Expiring Soon:</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${certificateList}
                    </ul>
                </div>
                
                <h3 style="color: #333;">Recommended Actions:</h3>
                <ol style="line-height: 1.6;">
                    <li>Start the renewal process for your certificate(s)</li>
                    <li>Prepare your updated certificate documents</li>
                    <li>Upload new certificates before expiration</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://fixmo.com/provider/certificates" 
                       style="display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Manage Certificates
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    <strong>Note:</strong> To avoid service interruptions, please renew your certificates before they expire.
                </p>
            </div>
        </div>
    `;

    await sendEmail({
        to: provider.provider_email,
        subject: `⏰ Certificate Expiry Reminder - ${certificates.length} Certificate(s) Expiring Soon`,
        html: emailHtml
    });

    console.log(`📧 Reminder email sent to ${provider.provider_email}`);
};

/**
 * Send push notification for expired certificates
 */
const sendCertificateExpiryPushNotification = async (providerId, certificates) => {
    try {
        await notificationService.sendNotification({
            userId: providerId,
            userType: 'provider',
            title: '⚠️ Certificate Expired - Services Deactivated',
            body: `${certificates.length} certificate(s) expired. Related service listings have been deactivated. Upload new certificates to reactivate.`,
            data: {
                type: 'certificate_expired',
                certificate_count: certificates.length,
                certificate_ids: certificates.map(c => c.certificate_id),
                action: 'services_deactivated'
            }
        });
        console.log(`📱 Expiry push notification sent to provider ${providerId}`);
    } catch (error) {
        console.error('Error sending expiry push notification:', error);
    }
};

/**
 * Send push notification reminder for expiring certificates
 */
const sendCertificateExpiryReminderPushNotification = async (providerId, certificates) => {
    try {
        const earliestExpiry = certificates.reduce((earliest, cert) => {
            const certDate = new Date(cert.expiry_date);
            return certDate < earliest ? certDate : earliest;
        }, new Date(certificates[0].expiry_date));

        const daysUntilExpiry = Math.ceil((earliestExpiry - new Date()) / (1000 * 60 * 60 * 24));

        await notificationService.sendNotification({
            userId: providerId,
            userType: 'provider',
            title: '⏰ Certificate Expiry Reminder',
            body: `${certificates.length} certificate(s) will expire in ${daysUntilExpiry} days. Renew now to avoid interruptions.`,
            data: {
                type: 'certificate_expiring_soon',
                certificate_count: certificates.length,
                days_until_expiry: daysUntilExpiry,
                certificate_ids: certificates.map(c => c.certificate_id)
            }
        });
        console.log(`📱 Reminder push notification sent to provider ${providerId}`);
    } catch (error) {
        console.error('Error sending reminder push notification:', error);
    }
};

/**
 * Initialize certificate expiry cron jobs
 */
export const initCertificateExpiryJobs = () => {
    console.log('🚀 Initializing certificate expiry jobs...');

    // Job 1: Check for expired certificates - Runs every 4 hours
    cron.schedule('0 */4 * * *', async () => {
        console.log('⏰ Certificate expiry check job triggered (every 4 hours)');
        await checkExpiredCertificates();
    });

    // Job 2: Check for expiring certificates - Runs every Monday at 9 AM
    cron.schedule('0 9 * * 1', async () => {
        console.log('⏰ Certificate expiry reminder job triggered (weekly on Monday)');
        await checkExpiringCertificates();
    });

    console.log('✅ Certificate expiry jobs initialized:');
    console.log('   - Expired certificates check: Every 4 hours');
    console.log('   - Expiring certificates reminder: Weekly on Monday at 9 AM');
};

/**
 * Manual trigger functions for testing
 */
export const manualCheckExpiredCertificates = checkExpiredCertificates;
export const manualCheckExpiringCertificates = checkExpiringCertificates;

export default {
    initCertificateExpiryJobs,
    manualCheckExpiredCertificates,
    manualCheckExpiringCertificates
};
