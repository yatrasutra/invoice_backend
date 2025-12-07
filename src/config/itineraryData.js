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
      notice: '0-10 days before travel',
      charge: '100% cancellation charges'
    },
    {
      notice: '11-20 days before travel',
      charge: '50% cancellation charges'
    },
    {
      notice: '21-30 days before travel',
      charge: '25% cancellation charges'
    },
    {
      notice: 'More than 30 days before travel',
      charge: '10% cancellation charges'
    }
  ],
  cancellationNotes: [
    'No refund for unused services',
    'Flight cancellation conditions apply as per airline policy',
    'Hotel-specific cancellation conditions may apply',
    'Peak-season restrictions may apply',
    'Force majeure clause: No refund for cancellations due to natural disasters, pandemics, or government restrictions'
  ],
  paymentTerms: [
    '50% advance payment required to confirm booking',
    'Remaining balance 7-10 days before travel',
    'No booking without advance payment',
    'Prices subject to availability',
    'Room upgrades subject to additional charges'
  ],
  termsAndConditions: [
    'Guest Responsibility: Guests are responsible for carrying valid identity proof, following local laws, and maintaining travel insurance',
    'Company Responsibility: Yatrasutra Holidays is responsible for providing services as per the itinerary and on-ground support',
    'Transport Limitations: Vehicle usage is limited to itinerary activities. Extra usage charges apply',
    'Permit Rules: Guests must obtain necessary permits for restricted areas. Company will assist but not responsible for permit delays',
    'Luggage Guidelines: Standard luggage allowance applies. Excess luggage charges as per airline/hotel policy',
    'Safety Guidelines: Guests must follow safety instructions during activities. Company not liable for injuries due to negligence',
    'Identity Proof Requirements: Valid passport/ID required for all bookings and check-ins',
    'Additional Charges: Parking fees, extra vehicle usage, room service, and personal expenses are not included',
    'Operational Flexibility: Itinerary may change due to weather, local conditions, or operational requirements. Alternative arrangements will be made'
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

