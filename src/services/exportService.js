import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure exports directory exists
const exportsDir = path.join(__dirname, '../../exports');
if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Generate CSV file for users
 */
export const generateUsersCSV = async (users) => {
    const timestamp = Date.now();
    const filename = `users_export_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
            { id: 'user_id', title: 'User ID' },
            { id: 'first_name', title: 'First Name' },
            { id: 'last_name', title: 'Last Name' },
            { id: 'email', title: 'Email' },
            { id: 'phone_number', title: 'Phone Number' },
            { id: 'user_location', title: 'Location' },
            { id: 'userName', title: 'Username' },
            { id: 'birthday', title: 'Birthday' },
            { id: 'is_verified', title: 'Verified' },
            { id: 'verification_status', title: 'Verification Status' },
            { id: 'is_activated', title: 'Active' },
            { id: 'verified_by_admin_id', title: 'Verified By Admin ID' },
            { id: 'deactivated_by_admin_id', title: 'Deactivated By Admin ID' },
            { id: 'rejection_reason', title: 'Rejection Reason' },
            { id: 'verification_submitted_at', title: 'Verification Submitted At' },
            { id: 'verification_reviewed_at', title: 'Verification Reviewed At' },
            { id: 'created_at', title: 'Created At' }
        ]
    });

    const records = users.map(user => ({
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        user_location: user.user_location || 'N/A',
        userName: user.userName,
        birthday: user.birthday ? new Date(user.birthday).toLocaleDateString() : 'N/A',
        is_verified: user.is_verified ? 'Yes' : 'No',
        verification_status: user.verification_status,
        is_activated: user.is_activated ? 'Yes' : 'No',
        verified_by_admin_id: user.verified_by_admin_id || 'N/A',
        deactivated_by_admin_id: user.deactivated_by_admin_id || 'N/A',
        rejection_reason: user.rejection_reason || 'N/A',
        verification_submitted_at: user.verification_submitted_at ? new Date(user.verification_submitted_at).toLocaleString() : 'N/A',
        verification_reviewed_at: user.verification_reviewed_at ? new Date(user.verification_reviewed_at).toLocaleString() : 'N/A',
        created_at: new Date(user.created_at).toLocaleString()
    }));

    await csvWriter.writeRecords(records);
    return { filename, filepath };
};

/**
 * Generate PDF file for users
 */
export const generateUsersPDF = async (users) => {
    const timestamp = Date.now();
    const filename = `users_export_${timestamp}.pdf`;
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Users Export Report', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Users: ${users.length}`, { align: 'left' });
    doc.moveDown();

    // Table headers
    const startY = doc.y;
    doc.fontSize(8);
    doc.text('ID', 50, startY, { width: 30 });
    doc.text('Name', 85, startY, { width: 100 });
    doc.text('Email', 190, startY, { width: 120 });
    doc.text('Phone', 315, startY, { width: 80 });
    doc.text('Status', 400, startY, { width: 60 });
    doc.text('Verified', 465, startY, { width: 50 });
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke();
    doc.moveDown();

    // Table rows
    users.forEach((user, index) => {
        const y = doc.y;
        
        // Check if we need a new page
        if (y > 700) {
            doc.addPage();
        }

        doc.text(user.user_id, 50, doc.y, { width: 30 });
        doc.text(`${user.first_name} ${user.last_name}`, 85, y, { width: 100 });
        doc.text(user.email, 190, y, { width: 120 });
        doc.text(user.phone_number, 315, y, { width: 80 });
        doc.text(user.verification_status, 400, y, { width: 60 });
        doc.text(user.is_verified ? 'Yes' : 'No', 465, y, { width: 50 });
        doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve({ filename, filepath }));
        stream.on('error', reject);
    });
};

/**
 * Generate CSV file for service providers
 */
export const generateProvidersCSV = async (providers) => {
    const timestamp = Date.now();
    const filename = `providers_export_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
            { id: 'provider_id', title: 'Provider ID' },
            { id: 'provider_uli', title: 'ULI (Unique License ID)' },
            { id: 'provider_first_name', title: 'First Name' },
            { id: 'provider_last_name', title: 'Last Name' },
            { id: 'provider_email', title: 'Email' },
            { id: 'provider_phone_number', title: 'Phone Number' },
            { id: 'provider_location', title: 'Location' },
            { id: 'provider_userName', title: 'Username' },
            { id: 'provider_birthday', title: 'Birthday' },
            { id: 'provider_isVerified', title: 'Verified' },
            { id: 'verification_status', title: 'Verification Status' },
            { id: 'provider_isActivated', title: 'Active' },
            { id: 'provider_rating', title: 'Rating' },
            { id: 'verified_by_admin_id', title: 'Verified By Admin ID' },
            { id: 'deactivated_by_admin_id', title: 'Deactivated By Admin ID' },
            { id: 'rejection_reason', title: 'Rejection Reason' },
            { id: 'verification_submitted_at', title: 'Verification Submitted At' },
            { id: 'verification_reviewed_at', title: 'Verification Reviewed At' },
            { id: 'created_at', title: 'Created At' }
        ]
    });

    const records = providers.map(provider => ({
        provider_id: provider.provider_id,
        provider_uli: provider.provider_uli || 'N/A',
        provider_first_name: provider.provider_first_name,
        provider_last_name: provider.provider_last_name,
        provider_email: provider.provider_email,
        provider_phone_number: provider.provider_phone_number,
        provider_location: provider.provider_location || 'N/A',
        provider_userName: provider.provider_userName,
        provider_birthday: provider.provider_birthday ? new Date(provider.provider_birthday).toLocaleDateString() : 'N/A',
        provider_isVerified: provider.provider_isVerified ? 'Yes' : 'No',
        verification_status: provider.verification_status,
        provider_isActivated: provider.provider_isActivated ? 'Yes' : 'No',
        provider_rating: provider.provider_rating.toFixed(1),
        verified_by_admin_id: provider.verified_by_admin_id || 'N/A',
        deactivated_by_admin_id: provider.deactivated_by_admin_id || 'N/A',
        rejection_reason: provider.rejection_reason || 'N/A',
        verification_submitted_at: provider.verification_submitted_at ? new Date(provider.verification_submitted_at).toLocaleString() : 'N/A',
        verification_reviewed_at: provider.verification_reviewed_at ? new Date(provider.verification_reviewed_at).toLocaleString() : 'N/A',
        created_at: new Date(provider.created_at).toLocaleString()
    }));

    await csvWriter.writeRecords(records);
    return { filename, filepath };
};

/**
 * Generate PDF file for service providers
 */
export const generateProvidersPDF = async (providers) => {
    const timestamp = Date.now();
    const filename = `providers_export_${timestamp}.pdf`;
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Service Providers Export Report', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Providers: ${providers.length}`, { align: 'left' });
    doc.moveDown();

    // Table headers
    const startY = doc.y;
    doc.fontSize(8);
    doc.text('ID', 50, startY, { width: 30 });
    doc.text('Name', 85, startY, { width: 100 });
    doc.text('Email', 190, startY, { width: 120 });
    doc.text('Phone', 315, startY, { width: 80 });
    doc.text('Rating', 400, startY, { width: 40 });
    doc.text('Status', 445, startY, { width: 60 });
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke();
    doc.moveDown();

    // Table rows
    providers.forEach((provider) => {
        const y = doc.y;
        
        if (y > 700) {
            doc.addPage();
        }

        doc.text(provider.provider_id, 50, doc.y, { width: 30 });
        doc.text(`${provider.provider_first_name} ${provider.provider_last_name}`, 85, y, { width: 100 });
        doc.text(provider.provider_email, 190, y, { width: 120 });
        doc.text(provider.provider_phone_number, 315, y, { width: 80 });
        doc.text(provider.provider_rating.toFixed(1), 400, y, { width: 40 });
        doc.text(provider.verification_status, 445, y, { width: 60 });
        doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve({ filename, filepath }));
        stream.on('error', reject);
    });
};

/**
 * Generate CSV file for certificates
 */
export const generateCertificatesCSV = async (certificates) => {
    const timestamp = Date.now();
    const filename = `certificates_export_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
            { id: 'certificate_id', title: 'Certificate ID' },
            { id: 'certificate_name', title: 'Certificate Name' },
            { id: 'certificate_number', title: 'Certificate Number' },
            { id: 'certificate_status', title: 'Status' },
            { id: 'provider_name', title: 'Provider Name' },
            { id: 'provider_email', title: 'Provider Email' },
            { id: 'provider_uli', title: 'Provider ULI' },
            { id: 'expiry_date', title: 'Expiry Date' },
            { id: 'reviewed_by_admin_id', title: 'Reviewed By Admin ID' },
            { id: 'reviewed_at', title: 'Reviewed At' },
            { id: 'created_at', title: 'Created At' }
        ]
    });

    const records = certificates.map(cert => ({
        certificate_id: cert.certificate_id,
        certificate_name: cert.certificate_name,
        certificate_number: cert.certificate_number,
        certificate_status: cert.certificate_status,
        provider_name: cert.provider ? `${cert.provider.provider_first_name} ${cert.provider.provider_last_name}` : 'N/A',
        provider_email: cert.provider?.provider_email || 'N/A',
        provider_uli: cert.provider?.provider_uli || 'N/A',
        expiry_date: cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'N/A',
        reviewed_by_admin_id: cert.reviewed_by_admin_id || 'N/A',
        reviewed_at: cert.reviewed_at ? new Date(cert.reviewed_at).toLocaleString() : 'N/A',
        created_at: new Date(cert.created_at).toLocaleString()
    }));

    await csvWriter.writeRecords(records);
    return { filename, filepath };
};

/**
 * Generate PDF file for certificates
 */
export const generateCertificatesPDF = async (certificates) => {
    const timestamp = Date.now();
    const filename = `certificates_export_${timestamp}.pdf`;
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Certificates Export Report', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Certificates: ${certificates.length}`, { align: 'left' });
    doc.moveDown();

    // Table headers
    const startY = doc.y;
    doc.fontSize(8);
    doc.text('ID', 50, startY, { width: 25 });
    doc.text('Name', 80, startY, { width: 120 });
    doc.text('Number', 205, startY, { width: 80 });
    doc.text('Status', 290, startY, { width: 60 });
    doc.text('Provider', 355, startY, { width: 100 });
    doc.text('Expiry', 460, startY, { width: 85 });
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke();
    doc.moveDown();

    // Table rows
    certificates.forEach((cert) => {
        const y = doc.y;
        
        if (y > 700) {
            doc.addPage();
        }

        doc.text(cert.certificate_id, 50, doc.y, { width: 25 });
        doc.text(cert.certificate_name, 80, y, { width: 120 });
        doc.text(cert.certificate_number, 205, y, { width: 80 });
        doc.text(cert.certificate_status, 290, y, { width: 60 });
        const providerName = cert.provider ? `${cert.provider.provider_first_name} ${cert.provider.provider_last_name}` : 'N/A';
        doc.text(providerName, 355, y, { width: 100 });
        const expiryDate = cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'N/A';
        doc.text(expiryDate, 460, y, { width: 85 });
        doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve({ filename, filepath }));
        stream.on('error', reject);
    });
};

/**
 * Generate CSV file for appointments
 */
export const generateAppointmentsCSV = async (appointments) => {
    const timestamp = Date.now();
    const filename = `appointments_export_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
            { id: 'appointment_id', title: 'Appointment ID' },
            { id: 'customer_name', title: 'Customer Name' },
            { id: 'customer_email', title: 'Customer Email' },
            { id: 'customer_phone', title: 'Customer Phone' },
            { id: 'provider_name', title: 'Provider Name' },
            { id: 'provider_email', title: 'Provider Email' },
            { id: 'provider_uli', title: 'Provider ULI' },
            { id: 'service_title', title: 'Service' },
            { id: 'appointment_status', title: 'Status' },
            { id: 'scheduled_date', title: 'Scheduled Date' },
            { id: 'final_price', title: 'Final Price' },
            { id: 'cancelled_by_admin_id', title: 'Cancelled By Admin ID' },
            { id: 'cancellation_reason', title: 'Provider Cancellation Reason' },
            { id: 'customer_cancellation_reason', title: 'Customer Cancellation Reason' },
            { id: 'created_at', title: 'Created At' }
        ]
    });

    const records = appointments.map(apt => ({
        appointment_id: apt.appointment_id,
        customer_name: apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : 'N/A',
        customer_email: apt.customer?.email || 'N/A',
        customer_phone: apt.customer?.phone_number || 'N/A',
        provider_name: apt.serviceProvider ? `${apt.serviceProvider.provider_first_name} ${apt.serviceProvider.provider_last_name}` : 'N/A',
        provider_email: apt.serviceProvider?.provider_email || 'N/A',
        provider_uli: apt.serviceProvider?.provider_uli || 'N/A',
        service_title: apt.service?.service_title || 'N/A',
        appointment_status: apt.appointment_status,
        scheduled_date: new Date(apt.scheduled_date).toLocaleString(),
        final_price: apt.final_price || 'N/A',
        cancelled_by_admin_id: apt.cancelled_by_admin_id || 'N/A',
        cancellation_reason: apt.cancellation_reason || 'N/A',
        customer_cancellation_reason: apt.customer_cancellation_reason || 'N/A',
        created_at: new Date(apt.created_at).toLocaleString()
    }));

    await csvWriter.writeRecords(records);
    return { filename, filepath };
};

/**
 * Generate PDF file for appointments
 */
export const generateAppointmentsPDF = async (appointments) => {
    const timestamp = Date.now();
    const filename = `appointments_export_${timestamp}.pdf`;
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Appointments Export Report', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Appointments: ${appointments.length}`, { align: 'left' });
    doc.moveDown();

    // Table headers
    const startY = doc.y;
    doc.fontSize(7);
    doc.text('ID', 50, startY, { width: 30 });
    doc.text('Customer', 85, startY, { width: 110 });
    doc.text('Provider', 200, startY, { width: 110 });
    doc.text('Service', 315, startY, { width: 100 });
    doc.text('Status', 420, startY, { width: 70 });
    doc.text('Date', 495, startY, { width: 120 });
    doc.text('Price', 620, startY, { width: 70 });
    doc.moveTo(50, doc.y + 5).lineTo(740, doc.y + 5).stroke();
    doc.moveDown();

    // Table rows
    appointments.forEach((apt) => {
        const y = doc.y;
        
        if (y > 520) {
            doc.addPage({ layout: 'landscape' });
        }

        doc.text(apt.appointment_id, 50, doc.y, { width: 30 });
        const customerName = apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : 'N/A';
        doc.text(customerName, 85, y, { width: 110 });
        const providerName = apt.serviceProvider ? `${apt.serviceProvider.provider_first_name} ${apt.serviceProvider.provider_last_name}` : 'N/A';
        doc.text(providerName, 200, y, { width: 110 });
        doc.text(apt.service?.service_title || 'N/A', 315, y, { width: 100 });
        doc.text(apt.appointment_status, 420, y, { width: 70 });
        doc.text(new Date(apt.scheduled_date).toLocaleDateString(), 495, y, { width: 120 });
        doc.text(apt.final_price ? `$${apt.final_price}` : 'N/A', 620, y, { width: 70 });
        doc.moveDown(0.5);
    });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve({ filename, filepath }));
        stream.on('error', reject);
    });
};

/**
 * Delete old export files (cleanup)
 */
export const cleanupOldExports = () => {
    const files = fs.readdirSync(exportsDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    files.forEach(file => {
        const filepath = path.join(exportsDir, file);
        const stats = fs.statSync(filepath);
        if (now - stats.mtimeMs > oneHour) {
            fs.unlinkSync(filepath);
            console.log(`Deleted old export file: ${file}`);
        }
    });
};
