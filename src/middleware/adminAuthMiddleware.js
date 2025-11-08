import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to authenticate admin requests
 * Verifies JWT token and checks if admin is active
 */
export const adminAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return res.status(401).json({ 
                message: 'Access denied. No token provided.' 
            });
        }

        // Extract token from "Bearer token" format
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        
        // Check if admin exists and is active
        const admin = await prisma.admin.findUnique({
            where: { admin_id: decoded.adminId },
            select: {
                admin_id: true,
                admin_username: true,
                admin_email: true,
                admin_name: true,
                admin_role: true,
                is_active: true,
                must_change_password: true
            }
        });

        if (!admin) {
            return res.status(401).json({ 
                message: 'Access denied. Admin not found.' 
            });
        }

        if (!admin.is_active) {
            return res.status(401).json({ 
                message: 'Access denied. Admin account is deactivated.' 
            });
        }

        // Attach admin info to request object
        req.admin = admin;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Access denied. Invalid token.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Access denied. Token expired.' 
            });
        }

        console.error('Admin auth middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.' 
        });
    }
};

/**
 * Middleware to check if admin has super admin role
 * Must be used after adminAuthMiddleware
 */
export const superAdminMiddleware = (req, res, next) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ 
                message: 'Access denied. Admin authentication required.' 
            });
        }

        if (req.admin.admin_role !== 'super_admin') {
            return res.status(403).json({ 
                message: 'Access denied. Super admin privileges required.' 
            });
        }

        next();
    } catch (error) {
        console.error('Super admin middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.' 
        });
    }
};

/**
 * Middleware to check if admin has operations or super_admin role
 * Must be used after adminAuthMiddleware
 * Used for penalty management routes
 */
export const operationsOrSuperAdminMiddleware = (req, res, next) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ 
                message: 'Access denied. Admin authentication required.' 
            });
        }

        const allowedRoles = ['super_admin', 'operations'];
        if (!allowedRoles.includes(req.admin.admin_role)) {
            return res.status(403).json({ 
                message: 'Access denied. Operations or Super Admin privileges required.' 
            });
        }

        next();
    } catch (error) {
        console.error('Operations/Super admin middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.' 
        });
    }
};

/**
 * Middleware to check if admin must change password
 * Returns appropriate response if password change is required
 */
export const checkPasswordChangeRequired = (req, res, next) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ 
                message: 'Access denied. Admin authentication required.' 
            });
        }

        // If this is the change password endpoint, allow it through
        if (req.path === '/change-password' && req.method === 'PUT') {
            return next();
        }

        if (req.admin.must_change_password) {
            return res.status(403).json({ 
                message: 'Password change required.',
                must_change_password: true,
                redirect_to: '/admin/change-password'
            });
        }

        next();
    } catch (error) {
        console.error('Password change check middleware error:', error);
        return res.status(500).json({ 
            message: 'Internal server error.' 
        });
    }
};

export default { 
    adminAuthMiddleware, 
    superAdminMiddleware, 
    operationsOrSuperAdminMiddleware,
    checkPasswordChangeRequired 
};
