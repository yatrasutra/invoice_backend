import express from 'express';
import { generateBrochurePDF } from '../utils/brochurePdfGenerator.js';
import { generateItineraryPDF } from '../utils/itineraryPdfGenerator.js';

const router = express.Router();

// Sample itinerary data for testing the new itinerary PDF generator
const sampleItineraryFormData = {
  guestName: 'John Doe',
  destination: 'Mysore',
  startDate: '2025-12-16',
  duration: '6',
  adults: 2,
  children: 0,
  infants: 0,
  tripId: 'TEST-001',
  quotePrice: 45000,
  paymentNote: '50% advance required',
  
  // Cover image - use a sample travel image URL
  coverHeroImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  
  hotels: [
    {
      name: 'Royal Orchid Brindavan Garden',
      location: 'Mysore',
      nightNumber: 1,
      nightEnd: 3,
      checkInDate: '2025-12-16',
      starRating: 4,
      numberOfRooms: 1,
      roomType: 'Deluxe Room',
      mealPlan: 'Breakfast & Dinner',
      paxDistribution: '2 Adults',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
    },
    {
      name: 'Radisson Blu Plaza',
      location: 'Bangalore',
      nightNumber: 4,
      nightEnd: 5,
      checkInDate: '2025-12-19',
      starRating: 5,
      numberOfRooms: 1,
      roomType: 'Premium Suite',
      mealPlan: 'All Meals',
      paxDistribution: '2 Adults',
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400'
    }
  ],
  
  days: [
    {
      dayNumber: 1,
      date: '2025-12-16',
      title: 'Arrival in Mysore - City Welcome',
      description: 'Arrive at Mysore Railway Station\nMeet and greet by our representative\nTransfer to the hotel and check-in\nEvening at leisure to explore local markets\nOvernight stay at hotel',
      imageUrl: 'https://images.unsplash.com/photo-1600011689032-8b628b8a8747?w=600'
    },
    {
      dayNumber: 2,
      date: '2025-12-17',
      title: 'Mysore Palace & Chamundi Hills',
      description: 'Breakfast at hotel\nVisit the magnificent Mysore Palace\nExplore Chamundi Hills and temple\nLunch at a traditional restaurant\nVisit Brindavan Gardens in the evening\nMusical fountain show\nDinner and overnight stay',
      imageUrl: 'https://images.unsplash.com/photo-1580667799535-3f9c3b4e9f63?w=600'
    },
    {
      dayNumber: 3,
      date: '2025-12-18',
      title: 'Srirangapatna Historical Tour',
      description: 'Breakfast at hotel\nDrive to Srirangapatna\nVisit Tipu Sultan Summer Palace\nExplore Gumbaz and historical sites\nReturn to Mysore\nShopping at Devaraja Market\nOvernight stay at hotel',
      imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600'
    }
  ],
  
  inclusions: [
    '5 Nights accommodation in listed hotels',
    'Daily Breakfast at all hotels',
    'Dinner at select hotels as mentioned',
    'All transfers and sightseeing by private AC vehicle',
    'Professional English-speaking driver',
    'All parking fees and fuel charges',
    'GST and all applicable taxes'
  ],
  
  exclusions: [
    'Airfare / Train tickets',
    'Meals not mentioned in the itinerary',
    'Entry fees to monuments and attractions',
    'Personal expenses like tips, laundry, phone calls',
    'Travel insurance',
    'Anything not mentioned in inclusions'
  ],
  
  consultantName: 'Priya Sharma',
  consultantPosition: 'Senior Travel Advisor',
  consultantMobile: '+91 97468 16609',
  consultantEmail: 'priya@yatrasutra.com'
};

// Sample test data for quick PDF preview
const sampleItineraryData = {
  destination: 'KUALA LUMPUR',
  travelDate: 'Nov 2025',
  duration: 3,
  adults: 2,
  children: 1,
  infants: 0,
  hotelCategory: '3*',
  mealPlan: 'BREAKFAST',
  transferPlan: 'PRIVATE',
  days: [
    {
      dayNumber: 1,
      title: 'ARRIVAL KUALA LUMPUR - KUALA LUMPUR CITY TOUR + KL TOWER',
      description: 'Arrive at Kula Lampur International airport. After emigration formalities, meet our representative at the airport Proceed to City tour of Kuala Lumpur - visit attractions likethe National Mosque, the National Monument, and have a photo stop at the Petronas twin towers and Independence Square, Chinatown and ParliamentHouse. Finally visit the King\'s Palace for a tour and photo stop. Finally, visit KL Tower. Overnight at hotel in Kuala Lumpur.'
    },
    {
      dayNumber: 2,
      title: 'DAY 02: BATU CAVES | GENTING HIGHLANDS TOUR',
      description: 'After breakfast, depart from your hotel for a day trip to Genting Highlands, a popular hill resort known for its entertainment options. Take a scenic drive up the mountain and enjoy a thrilling ride on the two-way cable car. Explore the attractions at Genting Highlands, such as the indoor and outdoor theme parks, shopping malls, and the casino. Have fun with various rides and games. Enjoy lunch at yourself one of the many dining establishments in Genting Highlands. After returning to Kuala Lumpur, visit the Batu Caves, a series of limestone caves and Hindu temples. Climb the steps to the main cave temple and marvel at the towering golden statue of Lord Murugan. Then dinner & over night stay'
    },
    {
      dayNumber: 3,
      title: 'Day 3: AQUARIUM + BIRD PARK TOUR',
      description: 'After breakfast, Immerse yourself in the wonders of nature as you embark on a journey through Kuala Lumpur\'s vibrant attractions. Begin your day with a visit to the renowned aquarium, where you\'ll encounter an array of marine life from colorful fish to majestic sharks. Explore the underwater world through mesmerizing exhibits and interactive displays, gaining insights into the diverse ecosystems of the ocean. Afterward, venture to the Bird Park, a tropical paradise home to over 3,000 birds representing various species from around the world. Stroll through lush landscapes and towering trees as you observe exotic birds in their natural habitats. Marvel at the vibrant plumage and graceful movements of parrots, flamingos, hornbills, and more, capturing stunning photos along the way.As the day unfolds, indulge yourself in a delicious lunch at a nearby eatery, savoring the flavors of Malaysian cuisine amidst the serene surroundings of the park. After recharging your energy, continue your exploration, taking in the sights and sounds of the bustling city. In the evening, treat yourself to a delightful dinner at a local restaurant, overnight stay at hotel'
    },
    {
      dayNumber: 4,
      title: 'Day 4: PUTRA JAYA & DEPARTURE',
      description: 'After breakfast checkout from the hotel, Spend the morning indulging in some retail therapy at Kuala Lumpur\'s premier shopping destinations. Lunch: Treat yourself to a delicious lunch at a restaurant offering your favorite cuisine. Before departing from Kuala Lumpur, make a stop at Putrajaya, Malaysia\'s federal administrative capital. Take a guided photo stop tour to admire the architectural marvels, including Putra Mosque, Putrajaya Lake, and the Prime Minister\'s Office.After the tour, your driver will transfer you to KLIA for your departure flight. Bid farewell to Kuala Lumpur as you head to your next destination.'
    }
  ],
  hotels: [
    {
      name: 'IBIS Frazer park',
      category: '3*',
      packageCostPerPerson: 21400,
      packageCostPerChild: 17000
    },
    {
      name: 'Hotel Metro-Sup',
      category: '3*',
      packageCostPerPerson: 23500,
      packageCostPerChild: 17900
    }
  ],
  inclusions: [
    '03 Nights at above Hotel in KUL',
    'Daily Breakfast at Hotel (Except Day one)',
    'Arrival & Departure Transfers',
    'KL City tour with chocolate outlet+KL Tower observation deck entry ticket',
    'Genting tour with 2-way cable car rides+Batu caves',
    'KL Aquarium entry ticket',
    'KL Bird park entry ticket',
    'En route puthra jaya photo stop tour',
    'All the taxes including Tourism Tax',
    '24-hour assistance in English via Hotline',
    'All on PVT basis unless stated above'
  ],
  customInclusions: '',
  exclusions: [
    'Any meals other than mentioned above',
    'Security deposit in hotel',
    'Porterage, Tips, Beverages, Telephone charges and all other items of personal nature',
    'Any service not specifically mentioned in inclusions',
    'INSURANCE',
    'Airfare'
  ],
  customExclusions: '',
  acceptTerms: true
};

/**
 * GET /api/test/pdf/preview
 * Generate a test PDF with sample data (Development only!)
 * Access directly in browser: http://localhost:5000/api/test/pdf/preview
 */
router.get('/pdf/preview', async (req, res) => {
  try {
    console.log('🎨 Generating preview PDF...');
    
    // Generate PDF with sample data
    const pdfBuffer = await generateBrochurePDF(sampleItineraryData, 'PREVIEW-' + Date.now());

    // Set response headers to display in browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview-brochure.pdf"');
    
    // Send the PDF
    res.send(Buffer.from(pdfBuffer));
    
    console.log('✅ Preview PDF generated successfully!');
  } catch (error) {
    console.error('❌ Error generating preview PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview PDF',
      message: error.message 
    });
  }
});

/**
 * POST /api/test/pdf/preview
 * Generate a test PDF with custom data
 * Send your own test data in the request body
 */
router.post('/pdf/preview', async (req, res) => {
  try {
    const customData = req.body.data || sampleItineraryData;
    
    console.log('🎨 Generating preview PDF with custom data...');
    
    const pdfBuffer = await generateBrochurePDF(customData, 'CUSTOM-PREVIEW-' + Date.now());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview-brochure.pdf"');
    
    res.send(Buffer.from(pdfBuffer));
    
    console.log('✅ Custom preview PDF generated successfully!');
  } catch (error) {
    console.error('❌ Error generating custom preview PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate preview PDF',
      message: error.message 
    });
  }
});

/**
 * GET /api/test/pdf/sample-data
 * Get the sample data structure for testing
 */
router.get('/pdf/sample-data', (req, res) => {
  res.json({
    message: 'Use this sample data structure for testing',
    sampleData: sampleItineraryData
  });
});

// ============================================================
// ITINERARY PDF TESTING ENDPOINTS (for itineraryPdfGenerator.js)
// ============================================================

/**
 * GET /api/test/itinerary/preview
 * Generate a test itinerary PDF with sample data
 * Access directly in browser: http://localhost:5000/api/test/itinerary/preview
 */
router.get('/itinerary/preview', async (req, res) => {
  try {
    console.log('🎨 Generating itinerary preview PDF...');
    
    // Generate PDF with sample itinerary data
    const pdfBuffer = await generateItineraryPDF(sampleItineraryFormData, 'ITINERARY-PREVIEW-' + Date.now());

    // Set response headers to display in browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview-itinerary.pdf"');
    
    // Send the PDF
    res.send(Buffer.from(pdfBuffer));
    
    console.log('✅ Itinerary preview PDF generated successfully!');
  } catch (error) {
    console.error('❌ Error generating itinerary preview PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate itinerary preview PDF',
      message: error.message 
    });
  }
});

/**
 * POST /api/test/itinerary/preview
 * Generate a test itinerary PDF with custom data
 * Send your own test data in the request body
 */
router.post('/itinerary/preview', async (req, res) => {
  try {
    const customData = req.body.data || sampleItineraryFormData;
    
    console.log('🎨 Generating itinerary preview PDF with custom data...');
    
    const pdfBuffer = await generateItineraryPDF(customData, 'CUSTOM-ITINERARY-' + Date.now());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview-itinerary.pdf"');
    
    res.send(Buffer.from(pdfBuffer));
    
    console.log('✅ Custom itinerary preview PDF generated successfully!');
  } catch (error) {
    console.error('❌ Error generating custom itinerary preview PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate itinerary preview PDF',
      message: error.message 
    });
  }
});

/**
 * GET /api/test/itinerary/sample-data
 * Get the sample itinerary data structure for testing
 */
router.get('/itinerary/sample-data', (req, res) => {
  res.json({
    message: 'Use this sample itinerary data structure for testing',
    sampleData: sampleItineraryFormData
  });
});

export default router;
