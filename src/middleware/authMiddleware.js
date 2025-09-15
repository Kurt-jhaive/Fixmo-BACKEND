import jwt from 'jsonwebtoken'

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    
    if (!authHeader) { 
        return res.status(401).json({ message: "No token provided" }) 
    }

    // Extract token from "Bearer token" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    // Test mode bypass for development
    if (token === 'test-token') {
        req.userId = 1; // Default test user ID
        req.userType = 'customer'; // Default test user type
        console.log('🧪 Test mode: Using test token with userId=1, userType=customer');
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) { 
            return res.status(401).json({ message: "Invalid token" }) 
        }

        req.userId = decoded.userId || decoded.id // Handle both formats
        req.userType = decoded.userType // Extract userType from token
        next()
    })
}

export default authMiddleware