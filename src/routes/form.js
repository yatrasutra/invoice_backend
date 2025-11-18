import express from 'express';
import { databases, storage, config } from '../config/appwrite.js';
import { Query, ID } from 'node-appwrite';
import { authenticateToken, authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Dynamic form schema - Booking Form
const formSchema = {
  fields: [
    // Client Details Section
    {
      name: 'clientName',
      label: 'Client Name',
      type: 'text',
      required: true,
      placeholder: 'Mr. Rajesh Menon'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'rajesh.menon@gmail.com'
    },
    {
      name: 'contactNo',
      label: 'Contact Number',
      type: 'text',
      required: true,
      placeholder: '+91 98850 12345'
    },
    
    // Booking Details Section
    {
      name: 'destination',
      label: 'Destination',
      type: 'text',
      required: true,
      placeholder: 'Lakshadweep'
    },
    {
      name: 'duration',
      label: 'Duration (Nights)',
      type: 'number',
      required: true,
      placeholder: '3',
      min: 1,
      max: 365
    },
    {
      name: 'checkInDate',
      label: 'Check-in Date',
      type: 'date',
      required: true
    },
    {
      name: 'checkOutDate',
      label: 'Check-out Date',
      type: 'date',
      required: true
    },
    {
      name: 'numberOfAdults',
      label: 'Number of Adults',
      type: 'number',
      required: true,
      placeholder: '8',
      min: 1,
      max: 50
    },
    {
      name: 'packageType',
      label: 'Package Type',
      type: 'select',
      required: true,
      options: [
        { value: 'deluxe', label: 'Deluxe' },
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
        { value: 'luxury', label: 'Luxury' }
      ]
    },
    {
      name: 'mealPlan',
      label: 'Meal Plan',
      type: 'select',
      required: true,
      options: [
        { value: 'MAP', label: 'MAP (Breakfast & Dinner)' },
        { value: 'CP', label: 'CP (Breakfast Only)' },
        { value: 'AP', label: 'AP (All Meals)' },
        { value: 'EP', label: 'EP (No Meals)' }
      ]
    },
    
    // Cost Details Section
    {
      name: 'costPerAdult',
      label: 'Tour Package Cost per Adult (INR)',
      type: 'number',
      required: true,
      placeholder: '27000',
      min: 0
    },
    {
      name: 'additionalServices',
      label: 'Additional Services (if any)',
      type: 'textarea',
      required: false,
      placeholder: 'Airport transfers, sightseeing, etc.'
    },
    {
      name: 'advanceAmount',
      label: 'Advance Amount (INR)',
      type: 'number',
      required: true,
      placeholder: '80000',
      min: 0
    },
    {
      name: 'paymentMode',
      label: 'Mode of Payment',
      type: 'select',
      required: true,
      options: [
        { value: 'UPI', label: 'UPI' },
        { value: 'Bank Transfer', label: 'Bank Transfer' },
        { value: 'Credit Card', label: 'Credit Card' },
        { value: 'Debit Card', label: 'Debit Card' },
        { value: 'Cash', label: 'Cash' }
      ]
    },
    {
      name: 'terms',
      label: 'I agree to the terms and conditions',
      type: 'checkbox',
      required: true
    }
  ]
};

/**
 * GET /api/form/schema
 * Get the dynamic form schema
 */
router.get('/schema', authenticateToken, (req, res) => {
  res.json(formSchema);
});

/**
 * POST /api/form/submit
 * Submit a new form
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Form data required' });
    }

    // Validate required fields
    const requiredFields = formSchema.fields
      .filter(field => field.required)
      .map(field => field.name);

    for (const field of requiredFields) {
      if (!data[field] && data[field] !== false) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }

    // Create submission in Appwrite
    const submission = await databases.createDocument(
      config.databaseId,
      config.submissionsCollectionId,
      ID.unique(),
      {
        userId: req.user.userId,
        data: JSON.stringify(data),
        status: 'pending'
      }
    );

    return res.status(201).json({
      message: 'Form submitted successfully',
      submissionId: submission.$id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ error: 'Failed to submit form' });
  }
});

/**
 * GET /api/form/my-submissions
 * Get current user's submissions
 */
router.get('/my-submissions', authenticateToken, async (req, res) => {
  try {
    const submissions = await databases.listDocuments(
      config.databaseId,
      config.submissionsCollectionId,
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
        downloadUrl: doc.status === 'approved' && doc.pdfUrl ? `/api/form/${doc.$id}/download` : null,
        adminMessage: doc.adminMessage,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt
      };
    });

    return res.json({ submissions: formattedSubmissions });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/form/:id
 * Get a specific submission
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await databases.getDocument(
      config.databaseId,
      config.submissionsCollectionId,
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
      downloadUrl: submission.status === 'approved' && submission.pdfUrl ? `/api/form/${submission.$id}/download` : null,
      adminMessage: submission.adminMessage,
      createdAt: submission.$createdAt,
      updatedAt: submission.$updatedAt
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

/**
 * GET /api/form/:id/download
 * Download PDF for a specific submission
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await databases.getDocument(
      config.databaseId,
      config.submissionsCollectionId,
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

    console.log('Attempting to download file ID:', fileId);
    console.log('From bucket:', config.bucketId);

    // Get file from Appwrite Storage
    const fileBuffer = await storage.getFileDownload(config.bucketId, fileId);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${submission.$id}.pdf"`);
    
    // Send the file buffer
    return res.send(Buffer.from(fileBuffer));

  } catch (error) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({ error: 'Failed to download PDF' });
  }
});

export default router;

