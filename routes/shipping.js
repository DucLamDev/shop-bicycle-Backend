import express from 'express';
import shippingService from '../services/shippingService.js';

const router = express.Router();

// Get shipping options
router.get('/options', (req, res) => {
  try {
    const { distance } = req.query;
    const distanceKm = distance ? parseFloat(distance) : null;
    const options = shippingService.getShippingOptions(distanceKm);
    
    res.json({
      success: true,
      data: {
        options,
        storeAddress: shippingService.STORE_ADDRESS,
        rates: shippingService.SHIPPING_RATES,
        thresholds: shippingService.DISTANCE_THRESHOLDS
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Calculate shipping fee
router.post('/calculate', async (req, res) => {
  try {
    const { address, postalCode, lat, lng, deliveryMethod } = req.body;

    let result;

    // If coordinates provided, use them directly
    if (lat && lng) {
      result = shippingService.calculateShippingFromCoordinates(
        parseFloat(lat),
        parseFloat(lng),
        deliveryMethod
      );
    }
    // If address provided and Google API key available, use Google Maps
    else if (address && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const fullAddress = postalCode ? `${postalCode} ${address}` : address;
        const distanceData = await shippingService.calculateDistanceWithGoogle(
          fullAddress,
          process.env.GOOGLE_MAPS_API_KEY
        );
        
        const shippingFee = shippingService.calculateShippingFee(
          distanceData.distanceKm,
          deliveryMethod
        );
        
        result = {
          ...shippingFee,
          ...distanceData,
          calculationMethod: 'google_maps'
        };
      } catch (googleError) {
        // Fallback to postal code estimation
        console.log('Google Maps fallback:', googleError.message);
        result = estimateFromPostalCode(postalCode, deliveryMethod);
      }
    }
    // Estimate based on postal code
    else if (postalCode) {
      result = estimateFromPostalCode(postalCode, deliveryMethod);
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Address, coordinates, or postal code required'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Estimate shipping from postal code (Japan postal codes)
function estimateFromPostalCode(postalCode, deliveryMethod) {
  if (deliveryMethod === 'pickup') {
    return shippingService.calculateShippingFee(0, 'pickup');
  }

  // Japan postal code format: XXX-XXXX
  // First 3 digits indicate prefecture/region
  const cleanCode = postalCode?.replace('-', '') || '';
  const prefix = cleanCode.substring(0, 3);
  
  // Store is in Kobe (651-xxxx)
  // Estimate distances based on postal code prefixes
  const kobeArea = ['650', '651', '652', '653', '654', '655', '656', '657', '658', '659'];
  const osakaArea = ['530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '540', '541', '542', '543', '544', '545', '546', '547', '548', '549', '550', '551', '552', '553', '554', '555', '556', '557', '558', '559', '560', '561', '562', '563', '564', '565', '566', '567', '568', '569', '570', '571', '572', '573', '574', '575', '576', '577', '578', '579', '580', '581', '582', '583', '584', '585', '586', '587', '588', '589', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599'];
  const kyotoArea = ['600', '601', '602', '603', '604', '605', '606', '607', '608', '609', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '621', '622', '623', '624', '625', '626', '627', '628', '629'];
  const hyogoArea = ['660', '661', '662', '663', '664', '665', '666', '667', '668', '669', '670', '671', '672', '673', '674', '675', '676', '677', '678', '679'];

  let estimatedDistance;
  
  if (kobeArea.includes(prefix)) {
    estimatedDistance = 10; // Within Kobe - free zone
  } else if (hyogoArea.includes(prefix)) {
    estimatedDistance = 35; // Hyogo area - zone 1
  } else if (osakaArea.includes(prefix)) {
    estimatedDistance = 40; // Osaka area - zone 1
  } else if (kyotoArea.includes(prefix)) {
    estimatedDistance = 80; // Kyoto area - zone 2
  } else {
    estimatedDistance = 150; // Other areas - postal
  }

  const result = shippingService.calculateShippingFee(estimatedDistance, deliveryMethod);
  return {
    ...result,
    estimatedDistance,
    calculationMethod: 'postal_code_estimate',
    note: 'Estimated based on postal code. Actual distance may vary.'
  };
}

// Get store information
router.get('/store', (req, res) => {
  res.json({
    success: true,
    data: {
      address: shippingService.STORE_ADDRESS,
      coordinates: shippingService.STORE_COORDINATES,
      businessHours: {
        weekdays: '10:00 - 19:00',
        saturday: '10:00 - 18:00',
        sunday: '休業日'
      },
      phone: '+81-XX-XXXX-XXXX'
    }
  });
});

export default router;
