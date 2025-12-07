import express from 'express';
import { databases, storage, config } from '../config/appwrite.js';
import { Query, ID, Permission, Role } from 'node-appwrite';
import { authenticateToken } from '../middleware/auth.js';
import { Blob } from 'buffer';
import {
  inclusionsList,
  exclusionsList,
  bookingPolicy,
  hotelCategories,
  mealPlans,
  transferPlans
} from '../config/itineraryData.js';

const router = express.Router();

// Dynamic form schema - Itinerary/Brochure Form
const itineraryFormSchema = {
  fields: [
    // Cover Page Details
    {
      name: 'guestName',
      label: 'Guest Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe'
    },
    {
      name: 'destination',
      label: 'Destination',
      type: 'text',
      required: true,
      placeholder: 'Port Blair'
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date',
      required: true
    },
    {
      name: 'duration',
      label: 'Duration (Nights / Days)',
      type: 'text',
      required: true,
      placeholder: '3 Nights / 4 Days'
    },
    {
      name: 'tripId',
      label: 'Trip ID',
      type: 'text',
      required: true,
      placeholder: 'YS-2025-001'
    },
    {
      name: 'quotePrice',
      label: 'Quote Price (Total in INR)',
      type: 'number',
      required: true,
      placeholder: '85000'
    },
    {
      name: 'paymentNote',
      label: 'Payment Note',
      type: 'text',
      required: false,
      placeholder: 'Book Now – Pay 50% to Confirm'
    },
    
    // Passenger Details
    {
      name: 'adults',
      label: 'Number of Adults',
      type: 'number',
      required: true,
      placeholder: '2',
      min: 1,
      max: 50
    },
    {
      name: 'children',
      label: 'Number of Children',
      type: 'number',
      required: false,
      placeholder: '1',
      min: 0,
      max: 20
    },
    {
      name: 'infants',
      label: 'Number of Infants',
      type: 'number',
      required: false,
      placeholder: '0',
      min: 0,
      max: 10
    },

    // Trip Configuration
    {
      name: 'hotelCategory',
      label: 'Hotel Category',
      type: 'select',
      required: true,
      options: hotelCategories
    },
    {
      name: 'mealPlan',
      label: 'Meal Plan',
      type: 'select',
      required: true,
      options: mealPlans
    },
    {
      name: 'transferPlan',
      label: 'Transfer Plan',
      type: 'select',
      required: true,
      options: transferPlans
    },

    // Day-wise Itinerary (Dynamic Array)
    {
      name: 'days',
      label: 'Day-wise Itinerary',
      type: 'array',
      required: true,
      itemSchema: {
        dayNumber: {
          label: 'Day Number',
          type: 'number',
          required: true
        },
        date: {
          label: 'Full Date',
          type: 'date',
          required: true
        },
        title: {
          label: 'Day Title',
          type: 'text',
          required: true,
          placeholder: 'Port Blair Arrival – Corbyn\'s Cove & Cellular Jail'
        },
        description: {
          label: 'Day Description (Bullet Points)',
          type: 'textarea',
          required: true,
          placeholder: '• Airport pickup\n• Hotel transfer\n• Sightseeing descriptions',
          rows: 6
        },
        ticketInclusion: {
          label: 'Ticket/Inclusion (Optional)',
          type: 'text',
          required: false,
          placeholder: 'Port Blair – Cellular Jail Entry Ticket'
        },
        imageUrl: {
          label: 'Day Image URL (from Appwrite)',
          type: 'text',
          required: false,
          placeholder: 'Upload image first, then paste URL here'
        }
      }
    },

    // Hotel Options (Dynamic Array)
    {
      name: 'hotels',
      label: 'Accommodation Options (One per night)',
      type: 'array',
      required: true,
      itemSchema: {
        nightNumber: {
          label: 'Night Number',
          type: 'number',
          required: true,
          placeholder: '1'
        },
        location: {
          label: 'Location',
          type: 'text',
          required: true,
          placeholder: 'Port Blair'
        },
        checkInDate: {
          label: 'Check-in Date',
          type: 'date',
          required: true
        },
        name: {
          label: 'Hotel Name',
          type: 'text',
          required: true,
          placeholder: 'Sea Shell Resort'
        },
        starRating: {
          label: 'Star Rating',
          type: 'select',
          required: true,
          options: [
            { value: '3*', label: '3 Star' },
            { value: '4*', label: '4 Star' },
            { value: '5*', label: '5 Star' },
            { value: 'Resort', label: 'Resort' },
            { value: 'Budget', label: 'Budget' }
          ]
        },
        roomType: {
          label: 'Room Type',
          type: 'text',
          required: true,
          placeholder: 'Deluxe Sea View'
        },
        numberOfRooms: {
          label: 'Number of Rooms',
          type: 'number',
          required: true,
          placeholder: '2',
          min: 1
        },
        paxDistribution: {
          label: 'Pax Distribution',
          type: 'text',
          required: true,
          placeholder: '2 Adults + 1 Child per room'
        },
        mealPlan: {
          label: 'Meal Plan',
          type: 'select',
          required: true,
          options: mealPlans
        },
        imageUrl: {
          label: 'Hotel Image URL (from Appwrite)',
          type: 'text',
          required: false,
          placeholder: 'Upload image first, then paste URL here'
        }
      }
    },

    // Transportation & Activities
    {
      name: 'transportation',
      label: 'Transportation & Activities',
      type: 'array',
      required: false,
      itemSchema: {
        day: {
          label: 'Day',
          type: 'text',
          required: true,
          placeholder: '1st Day, Wed 11 Feb'
        },
        serviceDescription: {
          label: 'Service Description',
          type: 'text',
          required: true,
          placeholder: 'Airport pickup, ferry transfer, sightseeing'
        },
        vehicleType: {
          label: 'Vehicle Type',
          type: 'text',
          required: false,
          placeholder: 'Xylo / Ertiga / Innova'
        },
        ticketsIncluded: {
          label: 'Tickets Included',
          type: 'text',
          required: false,
          placeholder: 'Cellular Jail Entry Ticket – 4 Adults + 1 Child'
        },
        ferryDetails: {
          label: 'Ferry Details (if applicable)',
          type: 'text',
          required: false,
          placeholder: 'Operator, duration, category'
        }
      }
    },

    // Inclusions (Checkboxes from predefined list)
    {
      name: 'inclusions',
      label: 'Inclusions',
      type: 'multiselect',
      required: true,
      options: inclusionsList.map(item => ({ value: item, label: item })),
      description: 'Select applicable inclusions'
    },

    // Custom Inclusions (Optional)
    {
      name: 'customInclusions',
      label: 'Additional Custom Inclusions',
      type: 'textarea',
      required: false,
      placeholder: 'Add any custom inclusions not in the list above',
      rows: 3
    },

    // Exclusions (Checkboxes from predefined list)
    {
      name: 'exclusions',
      label: 'Exclusions',
      type: 'multiselect',
      required: true,
      options: exclusionsList.map(item => ({ value: item, label: item })),
      description: 'Select applicable exclusions'
    },

    // Custom Exclusions (Optional)
    {
      name: 'customExclusions',
      label: 'Additional Custom Exclusions',
      type: 'textarea',
      required: false,
      placeholder: 'Add any custom exclusions not in the list above',
      rows: 3
    },

    // Cover Page Hero Image
    {
      name: 'coverHeroImageUrl',
      label: 'Cover Page Hero Image URL (from Appwrite)',
      type: 'text',
      required: false,
      placeholder: 'Upload image first, then paste URL here'
    },

    // Optional Activity Rate Card
    {
      name: 'activityRateCard',
      label: 'Activity Rate Card (Optional)',
      type: 'array',
      required: false,
      itemSchema: {
        activityName: {
          label: 'Activity Name',
          type: 'text',
          required: true,
          placeholder: 'Scuba Diving'
        },
        pricePerPerson: {
          label: 'Price Per Person (INR)',
          type: 'number',
          required: true,
          placeholder: '3500'
        },
        note: {
          label: 'Note',
          type: 'text',
          required: false,
          placeholder: 'Weather subject, government rules, etc.'
        }
      }
    },

    // Consultant Information
    {
      name: 'consultantName',
      label: 'Travel Consultant Name',
      type: 'text',
      required: true,
      placeholder: 'Rajesh Kumar'
    },
    {
      name: 'consultantPosition',
      label: 'Consultant Position',
      type: 'text',
      required: true,
      placeholder: 'Travel Consultant / Senior Executive / Team Leader'
    },
    {
      name: 'consultantMobile',
      label: 'Consultant Mobile Number',
      type: 'text',
      required: true,
      placeholder: '+91 98765 43210'
    },
    {
      name: 'consultantEmail',
      label: 'Consultant Email',
      type: 'email',
      required: true,
      placeholder: 'rajesh@yatrasutra.com'
    },

    // Terms Acceptance
    {
      name: 'acceptTerms',
      label: 'I accept the booking policy and terms & conditions',
      type: 'checkbox',
      required: true
    }
  ],
  metadata: {
    inclusionsList,
    exclusionsList,
    bookingPolicy
  }
};

/**
 * GET /api/itinerary/schema
 * Get the dynamic form schema for itinerary
 */
router.get('/schema', authenticateToken, (req, res) => {
  res.json(itineraryFormSchema);
});

/**
 * POST /api/itinerary/submit
 * Submit a new itinerary form
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Itinerary data required' });
    }

    // Validate required fields
    const requiredFields = ['guestName', 'destination', 'startDate', 'duration', 'tripId', 'quotePrice', 'adults', 'days', 'hotels', 'inclusions', 'exclusions', 'consultantName', 'consultantPosition', 'consultantMobile', 'consultantEmail', 'acceptTerms'];

    for (const field of requiredFields) {
      if (!data[field] && data[field] !== false && data[field] !== 0) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }

    // Validate days array
    if (!Array.isArray(data.days) || data.days.length === 0) {
      return res.status(400).json({ error: 'At least one day itinerary is required' });
    }

    // Validate hotels array
    if (!Array.isArray(data.hotels) || data.hotels.length === 0) {
      return res.status(400).json({ error: 'At least one hotel option is required' });
    }

    // Create submission in Appwrite
    const submission = await databases.createDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      ID.unique(),
      {
        userId: req.user.userId,
        data: JSON.stringify(data),
        status: 'pending'
      }
    );

    return res.status(201).json({
      message: 'Itinerary submitted successfully',
      submissionId: submission.$id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Itinerary submission error:', error);
    return res.status(500).json({ error: 'Failed to submit itinerary' });
  }
});

/**
 * GET /api/itinerary/my-submissions
 * Get current user's itinerary submissions
 */
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const submissions = await databases.listDocuments(
      config.databaseId,
      config.itinerariesCollectionId,
      [
        Query.equal('userId', req.user.userId),
        Query.orderDesc('$createdAt')
      ]
    );

    const formattedSubmissions = submissions.documents.map(doc => {
      // Extract URL from format: {fileId}|{url}
      const pdfUrl = doc.pdfUrl ? (doc.pdfUrl.includes('|') ? doc.pdfUrl.split('|')[1] : doc.pdfUrl) : null;
      
      return {
        id: doc.$id,
        status: doc.status,
        data: JSON.parse(doc.data),
        pdfUrl: pdfUrl,
        downloadUrl: doc.status === 'approved' && doc.pdfUrl ? `/api/itinerary/${doc.$id}/download` : null,
        adminMessage: doc.adminMessage,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt
      };
    });

    return res.json({ submissions: formattedSubmissions });

  } catch (error) {
    console.error('Error fetching itinerary submissions:', error);
    return res.status(500).json({ error: 'Failed to fetch itinerary submissions' });
  }
});

/**
 * GET /api/itinerary/:id
 * Get a specific itinerary submission
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await databases.getDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id
    );

    // Check if user owns this submission or is admin
    if (submission.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Extract URL from format: {fileId}|{url}
    const pdfUrl = submission.pdfUrl ? (submission.pdfUrl.includes('|') ? submission.pdfUrl.split('|')[1] : submission.pdfUrl) : null;
    
    return res.json({
      id: submission.$id,
      userId: submission.userId,
      status: submission.status,
      data: JSON.parse(submission.data),
      pdfUrl: pdfUrl,
      downloadUrl: submission.status === 'approved' && submission.pdfUrl ? `/api/itinerary/${submission.$id}/download` : null,
      adminMessage: submission.adminMessage,
      createdAt: submission.$createdAt,
      updatedAt: submission.$updatedAt
    });

  } catch (error) {
    console.error('Error fetching itinerary submission:', error);
    return res.status(500).json({ error: 'Failed to fetch itinerary submission' });
  }
});

/**
 * GET /api/itinerary/:id/download
 * Download PDF brochure for a specific itinerary submission
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await databases.getDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id
    );

    // Check if user owns this submission or is admin
    if (submission.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if PDF exists
    if (!submission.pdfUrl || submission.status !== 'approved') {
      return res.status(404).json({ error: 'PDF not available' });
    }

    // Extract file ID from pdfUrl
    // New format: {fileId}|{fullUrl}
    let fileId;
    if (submission.pdfUrl.includes('|')) {
      fileId = submission.pdfUrl.split('|')[0];
    } else {
      // Fallback to regex extraction for old format
      const fileIdMatch = submission.pdfUrl.match(/files\/([^\/\?]+)/);
      if (!fileIdMatch) {
        return res.status(500).json({ error: 'Invalid PDF URL' });
      }
      fileId = fileIdMatch[1];
    }

    // Get file from Appwrite Storage
    const fileBuffer = await storage.getFileDownload(config.bucketId, fileId);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="brochure-${submission.$id}.pdf"`);
    
    // Send the file buffer
    return res.send(Buffer.from(fileBuffer));

  } catch (error) {
    console.error('Error downloading brochure PDF:', error);
    return res.status(500).json({ error: 'Failed to download brochure' });
  }
});

/**
 * POST /api/itinerary/upload-image
 * Upload an image to Appwrite Storage for itinerary (cover, day, or hotel images)
 * Accepts: multipart/form-data with 'image' field and optional 'type' field (cover|day|hotel)
 */
router.post('/upload-image', authenticateToken, async (req, res) => {
  // Allowed file extensions (commonly supported by Appwrite buckets)
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  
  try {
    // Check if request has file (multipart/form-data)
    if (!req.body.image && !req.body.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // For base64 encoded images
    let imageBuffer;
    let fileName;
    let mimeType = 'image/jpeg';
    
    if (req.body.image) {
      // Handle base64 encoded image
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Extract mime type from data URL and normalize extension
      const mimeMatch = req.body.image.match(/data:image\/(\w+);base64/);
      if (mimeMatch) {
        let extension = mimeMatch[1].toLowerCase();
        // Normalize common extensions
        if (extension === 'jpeg') extension = 'jpg';
        if (extension === 'svg+xml') extension = 'svg';
        
        // Ensure extension is in allowed list, default to jpg if not
        if (!allowedExtensions.includes(extension)) {
          console.warn(`Extension ${extension} not in allowed list, defaulting to jpg`);
          extension = 'jpg';
          mimeType = 'image/jpeg';
        } else {
          mimeType = `image/${mimeMatch[1]}`;
        }
        
        fileName = `itinerary-image-${Date.now()}.${extension}`;
      } else {
        // Default to jpg if no mime type found
        mimeType = 'image/jpeg';
        fileName = `itinerary-image-${Date.now()}.jpg`;
      }
    } else {
      return res.status(400).json({ error: 'Please provide image as base64 in "image" field' });
    }

    // Create a File-like object for Appwrite
    const blob = new Blob([imageBuffer], { type: mimeType });
    const file = new File([blob], fileName, { 
      type: mimeType,
      lastModified: Date.now()
    });

    // Upload to Appwrite Storage (uses imagesBucketId which falls back to bucketId if not set)
    const uploadedFile = await storage.createFile(
      config.imagesBucketId,
      ID.unique(),
      file,
      [
        Permission.read(Role.user(req.user.userId)),
        Permission.read(Role.any()) // Allow public read access
      ]
    );

    // Generate file URL
    const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${config.imagesBucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

    return res.json({
      message: 'Image uploaded successfully',
      fileId: uploadedFile.$id,
      url: fileUrl,
      // Return in format: fileId|url for consistency
      imageUrl: `${uploadedFile.$id}|${fileUrl}`
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Provide helpful error message for file extension issues
    if (error.type === 'storage_file_type_unsupported' || (error.code === 400 && error.message?.includes('extension'))) {
      const attemptedExtension = fileName ? fileName.split('.').pop() : 'unknown';
      return res.status(400).json({ 
        error: 'File extension not allowed', 
        details: `The file extension "${attemptedExtension}" is not allowed in your Appwrite bucket. Please configure your bucket to allow these extensions: ${allowedExtensions.join(', ')}. You can do this in the Appwrite Console under Storage > Buckets > [Your Bucket] > Settings > Allowed file extensions.`,
        attemptedExtension: attemptedExtension,
        allowedExtensions: allowedExtensions
      });
    }
    
    return res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

/**
 * POST /api/itinerary/upload-image-multipart
 * Alternative endpoint for multipart/form-data uploads
 * Requires: multer middleware (if you want to add it) or handle via base64
 */
router.post('/upload-image-multipart', authenticateToken, express.raw({ type: 'multipart/form-data', limit: '10mb' }), async (req, res) => {
  try {
    // This is a placeholder - for proper multipart handling, you'd need multer
    // For now, recommend using the base64 endpoint above
    return res.status(501).json({ 
      error: 'Multipart upload not yet implemented. Please use /upload-image with base64 encoded image.' 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;

