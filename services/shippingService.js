// Shipping calculation service using distance-based pricing
// Store address: 651-0077 神戸市中央区日暮通2-4-18-1F

const STORE_ADDRESS = '651-0077 神戸市中央区日暮通2-4-18-1F';
const STORE_COORDINATES = { lat: 34.6937, lng: 135.1956 }; // Kobe city center approximate

// Shipping fee structure (in yen)
const SHIPPING_RATES = {
  PICKUP: 0,           // Self pickup at store
  FREE_ZONE: 0,        // Within 20km - FREE
  ZONE_1: 2500,        // 20-50km
  ZONE_2: 5000,        // 50-100km
  POSTAL: {            // Over 100km - postal delivery
    min: 5000,
    max: 6000,
    estimate: 5500
  }
};

// Distance thresholds in km
const DISTANCE_THRESHOLDS = {
  FREE: 20,
  ZONE_1: 50,
  ZONE_2: 100
};

// Calculate distance between two coordinates using Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate shipping fee based on distance
export function calculateShippingFee(distanceKm, deliveryMethod = 'delivery') {
  if (deliveryMethod === 'pickup') {
    return {
      fee: SHIPPING_RATES.PICKUP,
      method: 'pickup',
      description: '店舗受取 (無料)',
      descriptionVi: 'Tự đến lấy tại cửa hàng (Miễn phí)',
      estimatedDays: 0
    };
  }

  if (distanceKm <= DISTANCE_THRESHOLDS.FREE) {
    return {
      fee: SHIPPING_RATES.FREE_ZONE,
      method: 'free_delivery',
      description: `${distanceKm.toFixed(1)}km - 送料無料`,
      descriptionVi: `${distanceKm.toFixed(1)}km - Miễn phí ship`,
      estimatedDays: 1
    };
  }

  if (distanceKm <= DISTANCE_THRESHOLDS.ZONE_1) {
    return {
      fee: SHIPPING_RATES.ZONE_1,
      method: 'zone_1',
      description: `${distanceKm.toFixed(1)}km - ¥${SHIPPING_RATES.ZONE_1.toLocaleString()}`,
      descriptionVi: `${distanceKm.toFixed(1)}km - ${SHIPPING_RATES.ZONE_1.toLocaleString()}¥`,
      estimatedDays: 2
    };
  }

  if (distanceKm <= DISTANCE_THRESHOLDS.ZONE_2) {
    return {
      fee: SHIPPING_RATES.ZONE_2,
      method: 'zone_2',
      description: `${distanceKm.toFixed(1)}km - ¥${SHIPPING_RATES.ZONE_2.toLocaleString()}`,
      descriptionVi: `${distanceKm.toFixed(1)}km - ${SHIPPING_RATES.ZONE_2.toLocaleString()}¥`,
      estimatedDays: 3
    };
  }

  // Over 100km - postal delivery
  return {
    fee: SHIPPING_RATES.POSTAL.estimate,
    method: 'postal',
    description: `${distanceKm.toFixed(1)}km - 郵便配送 ¥${SHIPPING_RATES.POSTAL.min.toLocaleString()}~¥${SHIPPING_RATES.POSTAL.max.toLocaleString()}`,
    descriptionVi: `${distanceKm.toFixed(1)}km - Gửi bưu điện ${SHIPPING_RATES.POSTAL.min.toLocaleString()}~${SHIPPING_RATES.POSTAL.max.toLocaleString()}¥`,
    estimatedDays: 5,
    isEstimate: true
  };
}

// Calculate distance using Google Maps API (requires API key)
export async function calculateDistanceWithGoogle(destinationAddress, apiKey) {
  if (!apiKey) {
    throw new Error('Google Maps API key is required');
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const origins = encodeURIComponent(STORE_ADDRESS);
    const destinations = encodeURIComponent(destinationAddress);
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}&language=ja`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      throw new Error('Unable to calculate distance');
    }

    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') {
      throw new Error('Destination not found');
    }

    const distanceKm = element.distance.value / 1000;
    const durationMinutes = Math.round(element.duration.value / 60);

    return {
      distanceKm,
      distanceText: element.distance.text,
      durationMinutes,
      durationText: element.duration.text,
      origin: STORE_ADDRESS,
      destination: destinationAddress
    };
  } catch (error) {
    console.error('Google Maps API error:', error);
    throw error;
  }
}

// Calculate shipping with coordinates (fallback when no API key)
export function calculateShippingFromCoordinates(lat, lng, deliveryMethod = 'delivery') {
  const distanceKm = calculateHaversineDistance(
    STORE_COORDINATES.lat,
    STORE_COORDINATES.lng,
    lat,
    lng
  );
  
  return {
    ...calculateShippingFee(distanceKm, deliveryMethod),
    distanceKm,
    calculationMethod: 'coordinates'
  };
}

// Get shipping options for checkout
export function getShippingOptions(distanceKm = null) {
  const options = [
    {
      id: 'pickup',
      name: '店舗受取',
      nameVi: 'Tự đến cửa hàng lấy xe',
      fee: 0,
      description: STORE_ADDRESS,
      estimatedDays: 0
    }
  ];

  if (distanceKm !== null) {
    const deliveryFee = calculateShippingFee(distanceKm, 'delivery');
    options.push({
      id: 'delivery',
      name: '配送',
      nameVi: 'Giao hàng tận nơi',
      fee: deliveryFee.fee,
      description: deliveryFee.description,
      descriptionVi: deliveryFee.descriptionVi,
      estimatedDays: deliveryFee.estimatedDays,
      isEstimate: deliveryFee.isEstimate
    });
  } else {
    // Return all zone options when distance is unknown
    options.push(
      {
        id: 'free_delivery',
        name: '無料配送 (20km以内)',
        nameVi: 'Miễn phí ship (trong 20km)',
        fee: 0,
        estimatedDays: 1
      },
      {
        id: 'zone_1',
        name: '配送 (20-50km)',
        nameVi: 'Ship 20-50km',
        fee: 2500,
        estimatedDays: 2
      },
      {
        id: 'zone_2',
        name: '配送 (50-100km)',
        nameVi: 'Ship 50-100km',
        fee: 5000,
        estimatedDays: 3
      },
      {
        id: 'postal',
        name: '郵便配送 (100km以上)',
        nameVi: 'Gửi bưu điện (trên 100km)',
        fee: 5500,
        estimatedDays: 5,
        isEstimate: true
      }
    );
  }

  return options;
}

export default {
  calculateShippingFee,
  calculateDistanceWithGoogle,
  calculateShippingFromCoordinates,
  getShippingOptions,
  STORE_ADDRESS,
  STORE_COORDINATES,
  SHIPPING_RATES,
  DISTANCE_THRESHOLDS
};
