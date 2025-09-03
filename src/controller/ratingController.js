import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Create a new rating (Customer rating a provider)
export const createRating = async (req, res) => {
    try {
        const { 
            appointment_id, 
            provider_id, 
            rating_value, 
            rating_comment 
        } = req.body;

        // Get customer ID from authenticated user
        const customer_id = req.userId;

        console.log('Creating rating with data:', {
            appointment_id: parseInt(appointment_id),
            provider_id: parseInt(provider_id),
            customer_id,
            rating_value: parseInt(rating_value),
            rating_comment
        });

        // Validate required fields
        if (!appointment_id || !provider_id || !rating_value) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID, Provider ID, and rating value are required'
            });
        }

        // Validate rating value (1-5 stars)
        const ratingNum = parseInt(rating_value);
        if (ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating value must be between 1 and 5'
            });
        }

        // Check if appointment exists and belongs to the customer
        const appointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                customer_id: customer_id,
                provider_id: parseInt(provider_id),
                appointment_status: 'completed' // Only allow rating completed appointments
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not completed, or you are not authorized to rate this appointment'
            });
        }

        // Check if customer has already rated this appointment
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                user_id: customer_id,
                rated_by: 'customer'
            }
        });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this appointment'
            });
        }

        // Handle photo upload if provided
        let rating_photo = null;
        if (req.file) {
            rating_photo = req.file.path;
            console.log('Rating photo uploaded:', rating_photo);
        }

        // Create the rating
        const newRating = await prisma.rating.create({
            data: {
                rating_value: ratingNum,
                rating_comment: rating_comment || null,
                rating_photo: rating_photo,
                appointment_id: parseInt(appointment_id),
                user_id: customer_id,
                provider_id: parseInt(provider_id),
                rated_by: 'customer'
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            }
        });

        // Update provider's average rating
        await updateProviderAverageRating(parseInt(provider_id));

        res.status(201).json({
            success: true,
            message: 'Rating created successfully',
            data: newRating
        });

    } catch (error) {
        console.error('Error creating rating:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating rating'
        });
    }
};

// Get all ratings for a specific provider
export const getProviderRatings = async (req, res) => {
    try {
        const { provider_id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get ratings with pagination
        const ratings = await prisma.rating.findMany({
            where: {
                provider_id: parseInt(provider_id),
                rated_by: 'customer'
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: skip,
            take: limit
        });

        // Get total count for pagination
        const totalRatings = await prisma.rating.count({
            where: {
                provider_id: parseInt(provider_id),
                rated_by: 'customer'
            }
        });

        // Calculate rating statistics
        const ratingStats = await prisma.rating.aggregate({
            where: {
                provider_id: parseInt(provider_id),
                rated_by: 'customer'
            },
            _avg: {
                rating_value: true
            },
            _count: {
                rating_value: true
            }
        });

        // Get rating distribution (1-5 stars count)
        const ratingDistribution = await Promise.all([1, 2, 3, 4, 5].map(async (star) => {
            const count = await prisma.rating.count({
                where: {
                    provider_id: parseInt(provider_id),
                    rated_by: 'customer',
                    rating_value: star
                }
            });
            return { star, count };
        }));

        res.status(200).json({
            success: true,
            data: {
                ratings,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalRatings / limit),
                    total_ratings: totalRatings,
                    has_next: page < Math.ceil(totalRatings / limit),
                    has_prev: page > 1
                },
                statistics: {
                    average_rating: ratingStats._avg.rating_value ? parseFloat(ratingStats._avg.rating_value.toFixed(2)) : 0,
                    total_ratings: ratingStats._count.rating_value,
                    rating_distribution: ratingDistribution
                }
            }
        });

    } catch (error) {
        console.error('Error fetching provider ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching ratings'
        });
    }
};

// Get customer's own ratings (ratings they've given)
export const getCustomerRatings = async (req, res) => {
    try {
        const customer_id = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const ratings = await prisma.rating.findMany({
            where: {
                user_id: customer_id,
                rated_by: 'customer'
            },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_profile_photo: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: skip,
            take: limit
        });

        const totalRatings = await prisma.rating.count({
            where: {
                user_id: customer_id,
                rated_by: 'customer'
            }
        });

        res.status(200).json({
            success: true,
            data: {
                ratings,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalRatings / limit),
                    total_ratings: totalRatings,
                    has_next: page < Math.ceil(totalRatings / limit),
                    has_prev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching customer ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching customer ratings'
        });
    }
};

// Update a rating (Customer can edit their own rating)
export const updateRating = async (req, res) => {
    try {
        const { rating_id } = req.params;
        const { rating_value, rating_comment } = req.body;
        const customer_id = req.userId;

        // Check if rating exists and belongs to the customer
        const existingRating = await prisma.rating.findFirst({
            where: {
                id: parseInt(rating_id),
                user_id: customer_id,
                rated_by: 'customer'
            }
        });

        if (!existingRating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found or you are not authorized to update this rating'
            });
        }

        // Validate rating value if provided
        if (rating_value) {
            const ratingNum = parseInt(rating_value);
            if (ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating value must be between 1 and 5'
                });
            }
        }

        // Handle photo upload if provided
        let rating_photo = existingRating.rating_photo;
        if (req.file) {
            // Delete old photo if it exists
            if (existingRating.rating_photo && fs.existsSync(existingRating.rating_photo)) {
                fs.unlinkSync(existingRating.rating_photo);
            }
            rating_photo = req.file.path;
        }

        // Update the rating
        const updatedRating = await prisma.rating.update({
            where: {
                id: parseInt(rating_id)
            },
            data: {
                ...(rating_value && { rating_value: parseInt(rating_value) }),
                ...(rating_comment !== undefined && { rating_comment }),
                rating_photo
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            }
        });

        // Update provider's average rating if rating value was changed
        if (rating_value) {
            await updateProviderAverageRating(existingRating.provider_id);
        }

        res.status(200).json({
            success: true,
            message: 'Rating updated successfully',
            data: updatedRating
        });

    } catch (error) {
        console.error('Error updating rating:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating rating'
        });
    }
};

// Delete a rating (Customer can delete their own rating)
export const deleteRating = async (req, res) => {
    try {
        const { rating_id } = req.params;
        const customer_id = req.userId;

        // Check if rating exists and belongs to the customer
        const existingRating = await prisma.rating.findFirst({
            where: {
                id: parseInt(rating_id),
                user_id: customer_id,
                rated_by: 'customer'
            }
        });

        if (!existingRating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found or you are not authorized to delete this rating'
            });
        }

        // Delete the photo if it exists
        if (existingRating.rating_photo && fs.existsSync(existingRating.rating_photo)) {
            fs.unlinkSync(existingRating.rating_photo);
        }

        // Delete the rating
        await prisma.rating.delete({
            where: {
                id: parseInt(rating_id)
            }
        });

        // Update provider's average rating
        await updateProviderAverageRating(existingRating.provider_id);

        res.status(200).json({
            success: true,
            message: 'Rating deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting rating:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deleting rating'
        });
    }
};

// Get appointments that can be rated by customer
export const getRateableAppointments = async (req, res) => {
    try {
        const customer_id = req.userId;

        // Get completed appointments that haven't been rated yet
        const appointments = await prisma.appointment.findMany({
            where: {
                customer_id: customer_id,
                appointment_status: 'completed',
                appointment_rating: {
                    none: {
                        rated_by: 'customer',
                        user_id: customer_id
                    }
                }
            },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_profile_photo: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            data: appointments
        });

    } catch (error) {
        console.error('Error fetching rateable appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching rateable appointments'
        });
    }
};

// Create a rating by provider for customer
export const createProviderRatingForCustomer = async (req, res) => {
    try {
        const { 
            appointment_id, 
            customer_id, 
            rating_value, 
            rating_comment 
        } = req.body;

        // Get provider ID from authenticated user
        const provider_id = req.userId;

        console.log('Provider creating rating for customer with data:', {
            appointment_id: parseInt(appointment_id),
            customer_id: parseInt(customer_id),
            provider_id,
            rating_value: parseInt(rating_value),
            rating_comment
        });

        // Validate required fields
        if (!appointment_id || !customer_id || !rating_value) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID, Customer ID, and rating value are required'
            });
        }

        // Validate rating value (1-5 stars)
        const ratingNum = parseInt(rating_value);
        if (ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating value must be between 1 and 5'
            });
        }

        // Check if appointment exists and belongs to the provider and customer
        const appointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                customer_id: parseInt(customer_id),
                provider_id: provider_id,
                appointment_status: 'finished' // Only allow rating finished appointments (settled but not completed)
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not finished, or you are not authorized to rate this appointment'
            });
        }

        // Check if provider has already rated this customer for this appointment
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                provider_id: provider_id,
                rated_by: 'provider'
            }
        });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this customer for this appointment'
            });
        }

        // Handle photo upload if provided
        let rating_photo = null;
        if (req.file) {
            rating_photo = req.file.path;
            console.log('Rating photo uploaded:', rating_photo);
        }

        // Create the rating
        const newRating = await prisma.rating.create({
            data: {
                rating_value: ratingNum,
                rating_comment: rating_comment || null,
                rating_photo: rating_photo,
                appointment_id: parseInt(appointment_id),
                user_id: parseInt(customer_id),
                provider_id: provider_id,
                rated_by: 'provider'
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            }
        });

        // Update customer's average rating
        await updateCustomerAverageRating(parseInt(customer_id));

        res.status(201).json({
            success: true,
            message: 'Customer rating created successfully',
            data: newRating
        });

    } catch (error) {
        console.error('Error creating customer rating:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating customer rating'
        });
    }
};

// Get appointments that can be rated by provider (for customers)
export const getProviderRateableAppointments = async (req, res) => {
    try {
        const provider_id = req.userId;

        // Get finished appointments that haven't been rated yet by provider
        const appointments = await prisma.appointment.findMany({
            where: {
                provider_id: provider_id,
                appointment_status: 'finished',
                appointment_rating: {
                    none: {
                        rated_by: 'provider',
                        provider_id: provider_id
                    }
                }
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Appointments that can be rated by provider',
            data: appointments
        });

    } catch (error) {
        console.error('Error fetching provider rateable appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching rateable appointments'
        });
    }
};

// Get ratings given by provider (to customers)
export const getProviderGivenRatings = async (req, res) => {
    try {
        const provider_id = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const ratings = await prisma.rating.findMany({
            where: {
                provider_id: provider_id,
                rated_by: 'provider'
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: skip,
            take: limit
        });

        const totalRatings = await prisma.rating.count({
            where: {
                provider_id: provider_id,
                rated_by: 'provider'
            }
        });

        res.status(200).json({
            success: true,
            data: {
                ratings,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalRatings / limit),
                    total_ratings: totalRatings,
                    has_next: page < Math.ceil(totalRatings / limit),
                    has_prev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching provider given ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching provider given ratings'
        });
    }
};

// Get customer's received ratings (ratings received from providers)
export const getCustomerReceivedRatings = async (req, res) => {
    try {
        const { customer_id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get ratings with pagination
        const ratings = await prisma.rating.findMany({
            where: {
                user_id: parseInt(customer_id),
                rated_by: 'provider'
            },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_profile_photo: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        service: {
                            select: {
                                service_title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: skip,
            take: limit
        });

        // Get total count for pagination
        const totalRatings = await prisma.rating.count({
            where: {
                user_id: parseInt(customer_id),
                rated_by: 'provider'
            }
        });

        // Calculate rating statistics
        const ratingStats = await prisma.rating.aggregate({
            where: {
                user_id: parseInt(customer_id),
                rated_by: 'provider'
            },
            _avg: {
                rating_value: true
            },
            _count: {
                rating_value: true
            }
        });

        // Get rating distribution (1-5 stars count)
        const ratingDistribution = await Promise.all([1, 2, 3, 4, 5].map(async (star) => {
            const count = await prisma.rating.count({
                where: {
                    user_id: parseInt(customer_id),
                    rated_by: 'provider',
                    rating_value: star
                }
            });
            return { star, count };
        }));

        res.status(200).json({
            success: true,
            data: {
                ratings,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalRatings / limit),
                    total_ratings: totalRatings,
                    has_next: page < Math.ceil(totalRatings / limit),
                    has_prev: page > 1
                },
                statistics: {
                    average_rating: ratingStats._avg.rating_value ? parseFloat(ratingStats._avg.rating_value.toFixed(2)) : 0,
                    total_ratings: ratingStats._count.rating_value,
                    rating_distribution: ratingDistribution
                }
            }
        });

    } catch (error) {
        console.error('Error fetching customer received ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching customer received ratings'
        });
    }
};

// Helper function to update provider's average rating
async function updateProviderAverageRating(provider_id) {
    try {
        const ratingStats = await prisma.rating.aggregate({
            where: {
                provider_id: provider_id,
                rated_by: 'customer'
            },
            _avg: {
                rating_value: true
            }
        });

        const averageRating = ratingStats._avg.rating_value ? parseFloat(ratingStats._avg.rating_value.toFixed(2)) : 0;

        await prisma.serviceProviderDetails.update({
            where: {
                provider_id: provider_id
            },
            data: {
                provider_rating: averageRating
            }
        });

        console.log(`Updated provider ${provider_id} average rating to ${averageRating}`);
    } catch (error) {
        console.error('Error updating provider average rating:', error);
    }
}

// Helper function to update customer's average rating
async function updateCustomerAverageRating(customer_id) {
    try {
        const ratingStats = await prisma.rating.aggregate({
            where: {
                user_id: customer_id,
                rated_by: 'provider'
            },
            _avg: {
                rating_value: true
            }
        });

        const averageRating = ratingStats._avg.rating_value ? parseFloat(ratingStats._avg.rating_value.toFixed(2)) : 0;

        // Note: You might want to add a customer_rating field to the User model
        // For now, we'll just log it. You can add this field later if needed.
        console.log(`Customer ${customer_id} average rating from providers: ${averageRating}`);

        // Uncomment below when you add customer_rating field to User model
        // await prisma.user.update({
        //     where: {
        //         user_id: customer_id
        //     },
        //     data: {
        //         customer_rating: averageRating
        //     }
        // });

    } catch (error) {
        console.error('Error updating customer average rating:', error);
    }
}

export default {
    createRating,
    createProviderRatingForCustomer,
    getProviderRatings,
    getCustomerRatings,
    getProviderRateableAppointments,
    getProviderGivenRatings,
    getCustomerReceivedRatings,
    updateRating,
    deleteRating,
    getRateableAppointments
};
