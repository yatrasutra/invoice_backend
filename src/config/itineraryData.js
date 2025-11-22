// Predefined data for itinerary/brochure generation

export const inclusionsList = [
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
];

export const exclusionsList = [
  'Any meals other than mentioned above',
  'Security deposit in hotel',
  'Porterage, Tips, Beverages, Telephone charges and all other items of personal nature',
  'Any service not specifically mentioned in inclusions',
  'INSURANCE',
  'Airfare'
];

export const bookingPolicy = {
  cancellationPolicy: [
    {
      notice: 'Before 15 days of the travel date',
      charge: '75% of the full amount'
    },
    {
      notice: 'Before 10 days of the travel date',
      charge: '100% of the full amount'
    }
  ],
  paymentTerms: [
    'Passport copy with 50% payment is required as advanced payment for the booking',
    'Full payment is required 15 days prior to the travel date OR according the time limit of booking'
  ],
  termsAndConditions: [
    'Rates are valid for Indian citizens only',
    'Early Check in/ Late Check Out/ Interconnecting rooms are subject to availability',
    'Any increase in the cost that may come into force prior to the departure date'
  ]
};

// Mapping destination names to image file names (to be added in src/assets/destinations/)
export const destinationImages = {
  'KUALA LUMPUR': {
    day1: 'kl-city.jpg',
    day2: 'batu-caves.jpg',
    day3: 'aquarium.jpg',
    day4: 'putrajaya.jpg'
  },
  'LAKSHADWEEP': {
    day1: 'lakshadweep-beach.jpg',
    day2: 'lakshadweep-island.jpg',
    day3: 'lakshadweep-water.jpg',
    day4: 'lakshadweep-sunset.jpg'
  },
  'MALDIVES': {
    day1: 'maldives-resort.jpg',
    day2: 'maldives-beach.jpg',
    day3: 'maldives-underwater.jpg',
    day4: 'maldives-villa.jpg'
  },
  'DEFAULT': {
    day1: 'default-day1.jpg',
    day2: 'default-day2.jpg',
    day3: 'default-day3.jpg',
    day4: 'default-day4.jpg'
  }
};

export const hotelCategories = [
  { value: '3*', label: '3 Star' },
  { value: '4*', label: '4 Star' },
  { value: '5*', label: '5 Star' }
];

export const mealPlans = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'MAP', label: 'MAP (Breakfast & Dinner)' },
  { value: 'CP', label: 'CP (Breakfast Only)' },
  { value: 'AP', label: 'AP (All Meals)' },
  { value: 'EP', label: 'EP (No Meals)' }
];

export const transferPlans = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'SHARED', label: 'Shared' },
  { value: 'SIC', label: 'Seat In Coach (SIC)' }
];

export default {
  inclusionsList,
  exclusionsList,
  bookingPolicy,
  destinationImages,
  hotelCategories,
  mealPlans,
  transferPlans
};

