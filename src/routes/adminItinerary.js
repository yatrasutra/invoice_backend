import express from 'express';
import { databases, storage, config } from '../config/appwrite.js';
import { Query, ID, Permission, Role } from 'node-appwrite';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { generateBrochurePDF } from '../utils/brochurePdfGenerator.js';
import { generateItineraryPDF } from '../utils/itineraryPdfGenerator.js';
import { Blob } from 'buffer';

const router = express.Router();

/**
 * GET /api/admin/itineraries
 * Get all itinerary submissions (admin only)
 */
router.get('/itineraries', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const queries = [Query.orderDesc('$createdAt')];
    
    if (status && status !== 'all') {
      // Ensure lowercase for consistent filtering
      queries.push(Query.equal('status', status.toLowerCase()));
    }

    console.log('Filter status:', status);
    console.log('Queries:', queries);

    const submissions = await databases.listDocuments(
      config.databaseId,
      config.itinerariesCollectionId,
      queries
    );

    console.log('Found submissions:', submissions.documents.length);
    if (submissions.documents.length > 0) {
      console.log('First submission status:', submissions.documents[0].status);
    }

    const formattedSubmissions = submissions.documents.map(doc => {
      // Extract URL from format: {fileId}|{url}
      const pdfUrl = doc.pdfUrl ? (doc.pdfUrl.includes('|') ? doc.pdfUrl.split('|')[1] : doc.pdfUrl) : null;
      
      return {
        id: doc.$id,
        userId: doc.userId,
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
 * POST /api/admin/itinerary/:id/approve
 * Approve an itinerary submission and generate brochure PDF
 */
router.post('/itinerary/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Starting approval process for itinerary: ${id}`);

    // Get submission
    const submission = await databases.getDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id
    );
    console.log(`📄 Current submission status: ${submission.status}`);

    if (submission.status === 'approved') {
      return res.status(400).json({ error: 'Itinerary already approved' });
    }

    const formData = JSON.parse(submission.data);
    console.log(`📝 Parsed form data for destination: ${formData.destination || 'N/A'}`);

    // Generate Itinerary PDF (new specification)
    console.log('🎨 Generating PDF...');
    const pdfBuffer = await generateItineraryPDF(formData, submission.$id);
    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Create a File object from the buffer
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const file = new File([blob], `brochure-${submission.$id}.pdf`, { 
      type: 'application/pdf',
      lastModified: Date.now()
    });

    // Upload PDF to Appwrite Storage
    console.log('📤 Uploading PDF to storage...');
    const uploadedFile = await storage.createFile(
      config.bucketId,
      ID.unique(),
      file,
      [
        Permission.read(Role.user(submission.userId)), // Allow the submission owner to read
        Permission.read(Role.any()) // Allow anyone with the link to read
      ]
    );
    console.log(`✅ PDF uploaded successfully, file ID: ${uploadedFile.$id}`);

    // Get file URL
    const pdfUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${config.bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    
    // Store file ID for easier retrieval
    const pdfFileId = uploadedFile.$id;

    // Update submission status
    console.log('📝 Updating submission status to approved...');
    console.log(`   Database ID: ${config.databaseId}`);
    console.log(`   Collection ID: ${config.itinerariesCollectionId}`);
    console.log(`   Document ID: ${id}`);
    
    const updatedSubmission = await databases.updateDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id,
      {
        status: 'approved',
        pdfUrl: `${pdfFileId}|${pdfUrl}` // Store both file ID and URL separated by |
      }
    );
    
    console.log(`✅ Status update complete!`);
    console.log(`   Updated status: ${updatedSubmission.status}`);
    console.log(`   Updated pdfUrl: ${updatedSubmission.pdfUrl ? 'Set' : 'Not set'}`);

    // Verify the update actually persisted by re-fetching
    const verifySubmission = await databases.getDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id
    );
    console.log(`🔍 Verification - Status in DB after update: ${verifySubmission.status}`);
    
    if (verifySubmission.status !== 'approved') {
      console.error('❌ CRITICAL: Status update did not persist! Expected "approved", got:', verifySubmission.status);
      return res.status(500).json({ 
        error: 'Status update failed to persist in database',
        expectedStatus: 'approved',
        actualStatus: verifySubmission.status
      });
    }

    return res.json({
      message: 'Itinerary approved successfully',
      submissionId: updatedSubmission.$id,
      status: verifySubmission.status, // Return the verified status from DB
      pdfUrl: pdfUrl,
      downloadUrl: `/api/itinerary/${updatedSubmission.$id}/download`
    });

  } catch (error) {
    console.error('❌ Error approving itinerary:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to approve itinerary', details: error.message });
  }
});

/**
 * POST /api/admin/itinerary/:id/reject
 * Reject an itinerary submission
 */
router.post('/itinerary/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // Get submission
    const submission = await databases.getDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id
    );

    if (submission.status === 'rejected') {
      return res.status(400).json({ error: 'Itinerary already rejected' });
    }

    // Update submission status
    const updatedSubmission = await databases.updateDocument(
      config.databaseId,
      config.itinerariesCollectionId,
      id,
      {
        status: 'rejected',
        adminMessage: message || 'Your itinerary submission has been rejected'
      }
    );

    return res.json({
      message: 'Itinerary rejected',
      submissionId: updatedSubmission.$id,
      status: 'rejected'
    });

  } catch (error) {
    console.error('Error rejecting itinerary:', error);
    return res.status(500).json({ error: 'Failed to reject itinerary' });
  }
});

export default router;

