// Rate limiting utility for OTP requests
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory storage for rate limiting (in production, use Redis)
const otpAttempts = new Map();
const forgotPasswordAttempts = new Map();

export const checkOTPRateLimit = async (email, maxAttempts = 3, windowMs = 30000) => {
    const now = Date.now();
    const key = `otp_${email}`;
    
    if (!otpAttempts.has(key)) {
        otpAttempts.set(key, { count: 0, firstAttempt: now });
    }
    
    const attempts = otpAttempts.get(key);
    
    // Reset if window has passed
    if (now - attempts.firstAttempt > windowMs) {
        attempts.count = 0;
        attempts.firstAttempt = now;
    }
    
    if (attempts.count >= maxAttempts) {
        const remainingTime = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
        return {
            allowed: false,
            remainingTime: Math.max(0, remainingTime),
            message: `Too many OTP requests. Please wait ${Math.max(0, remainingTime)} seconds before trying again.`
        };
    }
    
    return { allowed: true };
};

export const recordOTPAttempt = (email) => {
    const now = Date.now();
    const key = `otp_${email}`;
    
    if (!otpAttempts.has(key)) {
        otpAttempts.set(key, { count: 1, firstAttempt: now });
    } else {
        const attempts = otpAttempts.get(key);
        attempts.count++;
    }
};

// Clean up old entries (call this periodically)
export const cleanupOldEntries = () => {
    const now = Date.now();
    const windowMs = 30000; // 30 seconds
    
    for (const [key, attempts] of otpAttempts.entries()) {
        if (now - attempts.firstAttempt > windowMs) {
            otpAttempts.delete(key);
        }
    }
};

// Forgot Password Rate Limiting (3 attempts, 30-minute cooldown)
export const checkForgotPasswordRateLimit = async (email) => {
    const now = Date.now();
    const key = `forgot_pwd_${email}`;
    const maxAttempts = 3;
    const windowMs = 30 * 60 * 1000; // 30 minutes
    
    if (!forgotPasswordAttempts.has(key)) {
        forgotPasswordAttempts.set(key, { count: 0, firstAttempt: now, lastAttempt: now });
    }
    
    const attempts = forgotPasswordAttempts.get(key);
    
    // Reset if window has passed
    if (now - attempts.firstAttempt > windowMs) {
        attempts.count = 0;
        attempts.firstAttempt = now;
        attempts.lastAttempt = now;
    }
    
    if (attempts.count >= maxAttempts) {
        const remainingTime = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
        const remainingMinutes = Math.ceil(remainingTime / 60);
        return {
            allowed: false,
            remainingTime,
            remainingMinutes,
            message: `Maximum forgot password attempts (${maxAttempts}) reached. Please try again in ${remainingMinutes} minutes.`
        };
    }
    
    return { allowed: true, attemptsLeft: maxAttempts - attempts.count };
};

export const recordForgotPasswordAttempt = (email) => {
    const now = Date.now();
    const key = `forgot_pwd_${email}`;
    
    if (!forgotPasswordAttempts.has(key)) {
        forgotPasswordAttempts.set(key, { count: 1, firstAttempt: now, lastAttempt: now });
    } else {
        const attempts = forgotPasswordAttempts.get(key);
        attempts.count++;
        attempts.lastAttempt = now;
    }
};

export const resetForgotPasswordAttempts = (email) => {
    const key = `forgot_pwd_${email}`;
    forgotPasswordAttempts.delete(key);
};

// Clean up old forgot password entries
export const cleanupForgotPasswordEntries = () => {
    const now = Date.now();
    const windowMs = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, attempts] of forgotPasswordAttempts.entries()) {
        if (now - attempts.firstAttempt > windowMs) {
            forgotPasswordAttempts.delete(key);
        }
    }
};

// Clean up every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);
setInterval(cleanupForgotPasswordEntries, 5 * 60 * 1000);
