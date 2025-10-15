/**
 * Location Utilities for Distance Calculation
 * Uses Haversine formula to calculate distance between two coordinates
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Parse location string in various formats
 * Supports: "lat,lng", "lat, lng", "{lat: x, lng: y}", JSON string
 * @param {string} locationString 
 * @returns {{lat: number, lng: number} | null}
 */
export function parseLocation(locationString) {
    if (!locationString) return null;
    
    try {
        // If it's already an object
        if (typeof locationString === 'object' && locationString.lat && locationString.lng) {
            return {
                lat: parseFloat(locationString.lat),
                lng: parseFloat(locationString.lng)
            };
        }
        
        // Try parsing as JSON
        if (locationString.startsWith('{')) {
            const parsed = JSON.parse(locationString);
            if (parsed.lat && parsed.lng) {
                return {
                    lat: parseFloat(parsed.lat),
                    lng: parseFloat(parsed.lng)
                };
            }
            if (parsed.latitude && parsed.longitude) {
                return {
                    lat: parseFloat(parsed.latitude),
                    lng: parseFloat(parsed.longitude)
                };
            }
        }
        
        // Try parsing as "lat,lng" format
        if (locationString.includes(',')) {
            const parts = locationString.split(',').map(s => s.trim());
            if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing location:', error);
        return null;
    }
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
}

/**
 * Get distance category
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Category: 'very-close', 'nearby', 'moderate', 'far'
 */
export function getDistanceCategory(distanceKm) {
    if (distanceKm < 1) return 'very-close';
    if (distanceKm < 5) return 'nearby';
    if (distanceKm < 15) return 'moderate';
    return 'far';
}

/**
 * Calculate distance between customer and provider
 * @param {string} customerLocation - Customer's exact_location
 * @param {string} providerLocation - Provider's provider_exact_location
 * @returns {{distance: number, formatted: string, category: string} | null}
 */
export function calculateCustomerProviderDistance(customerLocation, providerLocation) {
    console.log('\n📍 ========== DISTANCE CALCULATION ==========');
    console.log('Customer location string:', customerLocation);
    console.log('Provider location string:', providerLocation);
    
    const customerCoords = parseLocation(customerLocation);
    const providerCoords = parseLocation(providerLocation);
    
    console.log('Customer coordinates parsed:', customerCoords);
    console.log('Provider coordinates parsed:', providerCoords);
    
    if (!customerCoords || !providerCoords) {
        console.log('❌ One or both coordinates failed to parse');
        console.log('===========================================\n');
        return null;
    }
    
    // Validate Philippines coordinates (rough bounds)
    const isCustomerInPH = customerCoords.lat >= 4 && customerCoords.lat <= 22 && 
                          customerCoords.lng >= 115 && customerCoords.lng <= 128;
    const isProviderInPH = providerCoords.lat >= 4 && providerCoords.lat <= 22 && 
                          providerCoords.lng >= 115 && providerCoords.lng <= 128;
    
    if (!isCustomerInPH) {
        console.log('⚠️ WARNING: Customer coordinates outside Philippines bounds!');
        console.log('   Expected: Lat 4-22°, Lng 115-128°');
        console.log('   Got:', customerCoords);
    }
    if (!isProviderInPH) {
        console.log('⚠️ WARNING: Provider coordinates outside Philippines bounds!');
        console.log('   Expected: Lat 4-22°, Lng 115-128°');
        console.log('   Got:', providerCoords);
        console.log('   🔧 Provider needs to update their location in the app!');
    }
    
    const distance = calculateDistance(
        customerCoords.lat,
        customerCoords.lng,
        providerCoords.lat,
        providerCoords.lng
    );
    
    console.log('✅ Distance calculated:', distance, 'km');
    console.log('   Formatted:', formatDistance(distance));
    console.log('   Category:', getDistanceCategory(distance));
    console.log('===========================================\n');
    
    return {
        distance,
        formatted: formatDistance(distance),
        category: getDistanceCategory(distance)
    };
}

export default {
    calculateDistance,
    parseLocation,
    formatDistance,
    getDistanceCategory,
    calculateCustomerProviderDistance
};
