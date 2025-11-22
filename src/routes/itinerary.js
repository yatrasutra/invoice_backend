import express from 'express';
import { databases, storage, config } from '../config/appwrite.js';
import { Query, ID } from 'node-appwrite';
import { authenticateToken } from '../middleware/auth.js';
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
    // Basic Trip Details Section
    {
      name: 'destination',
      label: 'Destination',
      type: 'text',
      required: true,
      placeholder: 'KUALA LUMPUR'
    },
    {
      name: 'travelDate',
      label: 'Travel Date (Month Year)',
      type: 'text',
      required: true,
      placeholder: 'Nov 2025'
    },
    {
      name: 'duration',
      label: 'Duration (Nights)',
      type: 'number',
      required: true,
      placeholder: '3',
      min: 1,
      max: 30
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
        title: {
          label: 'Day Title',
          type: 'text',
          required: true,
          placeholder: 'ARRIVAL KUALA LUMPUR - KUALA LUMPUR CITY TOUR + KL TOWER'
        },
        description: {
          label: 'Day Description',
          type: 'textarea',
          required: true,
          placeholder: 'Arrive at Kula Lampur International airport. After emigration formalities...',
          rows: 6
        }
      }
    },

    // Hotel Options (Dynamic Array)
    {
      name: 'hotels',
      label: 'Accommodation Options',
      type: 'array',
      required: true,
      itemSchema: {
        name: {
          label: 'Hotel Name',
          type: 'text',
          required: true,
          placeholder: 'IBIS Frazer park'
        },
        category: {
          label: 'Hotel Category',
          type: 'select',
          required: true,
          options: hotelCategories
        },
        packageCostPerPerson: {
          label: 'Package Cost Per Person (INR)',
          type: 'number',
          required: true,
          placeholder: '21400'
        },
        packageCostPerChild: {
          label: 'Package Cost Per Child (INR)',
          type: 'number',
          required: true,
          placeholder: '17000'
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
    const requiredFields = ['destination', 'travelDate', 'duration', 'adults', 'hotelCategory', 'mealPlan', 'transferPlan', 'days', 'hotels', 'inclusions', 'exclusions', 'acceptTerms'];

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

export default router;

