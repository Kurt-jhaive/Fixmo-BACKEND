import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const verifyServiceProvider = async (req, res) =>{
    const {provider_isVerified, provider_id, rejection_reason} = req.body;

    try {
        // Prepare update data
        const updateData = {
            provider_isVerified,
            verification_status: provider_isVerified ? 'approved' : 'rejected',
            verification_reviewed_at: new Date()
        };

        // Add rejection reason only if rejecting
        if (!provider_isVerified && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        } else if (provider_isVerified) {
            // Clear rejection reason if approving
            updateData.rejection_reason = null;
        }

        const verifyProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id },
            data: updateData
        });

        res.status(200).json({ 
            message: `Service provider ${provider_isVerified ? 'approved' : 'rejected'} successfully`, 
            data: verifyProvider 
        });
    } catch (error) {
        console.error('Error updating service provider verification status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
} 

export const verifyCustomer = async (req, res) => {
    const { is_verified, user_id, rejection_reason } = req.body;

    try {
        // Prepare update data
        const updateData = {
            is_verified,
            verification_status: is_verified ? 'approved' : 'rejected',
            verification_reviewed_at: new Date()
        };

        // Add rejection reason only if rejecting
        if (!is_verified && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        } else if (is_verified) {
            // Clear rejection reason if approving
            updateData.rejection_reason = null;
        }

        const verifyCustomer = await prisma.user.update({
            where: { user_id },
            data: updateData
        });

        res.status(200).json({ 
            message: `Customer ${is_verified ? 'approved' : 'rejected'} successfully`, 
            data: verifyCustomer 
        });
    } catch (error) {
        console.error('Error updating customer verification status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


export const getUnverifiedServiceProviders = async (req, res) => {
  try {
    const unverifiedProviders = await prisma.serviceProviderDetails.findMany({
      where: {
        provider_isVerified: false
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        provider_id: true,
        provider_first_name: true,
        provider_last_name: true,
        provider_email: true,
        provider_phone_number: true,
        provider_profile_photo: true,
        provider_valid_id: true,
        provider_isVerified: true,
        verification_status: true,
        rejection_reason: true,
        verification_submitted_at: true,
        verification_reviewed_at: true,
        created_at: true,
        provider_location: true,
        provider_certificates: {
          select: {
            certificate_id: true,
            certificate_name: true,
            certificate_file_path: true,
            certificate_status: true,
            certificate_reason: true,
            created_at: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Fetched unverified service providers',
      data: unverifiedProviders
    });

  } catch (error) {
    console.error('Error fetching unverified service providers:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

export const getUnverifiedCustomers = async (req, res) => {
    try {
        const unverifiedCustomers = await prisma.user.findMany({
            where: {
                is_verified: false
            },
            orderBy: {
                created_at: 'desc'
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
                profile_photo: true,
                valid_id: true,
                user_location: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            }
        });
    
        res.status(200).json({
            success: true,
            message: 'Fetched unverified customers',
            data: unverifiedCustomers
        });
    
    } catch (error) {
        console.error('Error fetching unverified customers:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

