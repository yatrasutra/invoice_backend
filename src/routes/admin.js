import express from 'express';
import { databases, storage, config } from '../config/appwrite.js';
import { Query, ID, Permission, Role } from 'node-appwrite';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Blob } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/admin/submissions
 * Get all submissions (admin only)
 */
router.get('/submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const queries = [Query.orderDesc('$createdAt')];
    
    if (status && status !== 'all') {
      queries.push(Query.equal('status', status));
    }

    const submissions = await databases.listDocuments(
      config.databaseId,
      config.submissionsCollectionId,
      queries
    );

    const formattedSubmissions = submissions.documents.map(doc => {
      // Extract URL from format: {fileId}|{url}
      const pdfUrl = doc.pdfUrl ? (doc.pdfUrl.includes('|') ? doc.pdfUrl.split('|')[1] : doc.pdfUrl) : null;
      
      return {
        id: doc.$id,
        userId: doc.userId,
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
 * POST /api/admin/form/:id/approve
 * Approve a submission and generate PDF
 */
router.post('/form/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get submission
    const submission = await databases.getDocument(
      config.databaseId,
      config.submissionsCollectionId,
      id
    );

    if (submission.status === 'approved') {
      return res.status(400).json({ error: 'Submission already approved' });
    }

    const formData = JSON.parse(submission.data);

    // Generate PDF
    const pdfBuffer = await generatePDF(formData, submission.$id);

    // Create a File object from the buffer (Node.js 20+ has File globally)
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const file = new File([blob], `submission-${submission.$id}.pdf`, { 
      type: 'application/pdf',
      lastModified: Date.now()
    });

    // Upload PDF to Appwrite Storage
    const uploadedFile = await storage.createFile(
      config.bucketId,
      ID.unique(),
      file,
      [
        Permission.read(Role.user(submission.userId)), // Allow the submission owner to read
        Permission.read(Role.any()) // Allow anyone with the link to read (adjust as needed)
      ]
    );

    // Get file URL (you may need to adjust based on your Appwrite setup)
    const pdfUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${config.bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    
    // Store file ID for easier retrieval
    const pdfFileId = uploadedFile.$id;

    // Update submission status
    const updatedSubmission = await databases.updateDocument(
      config.databaseId,
      config.submissionsCollectionId,
      id,
      {
        status: 'approved',
        pdfUrl: `${pdfFileId}|${pdfUrl}` // Store both file ID and URL separated by |
      }
    );

    return res.json({
      message: 'Submission approved successfully',
      submissionId: updatedSubmission.$id,
      status: 'approved',
      pdfUrl: pdfUrl,
      downloadUrl: `/api/form/${updatedSubmission.$id}/download`
    });

  } catch (error) {
    console.error('Error approving submission:', error);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
});

/**
 * POST /api/admin/form/:id/reject
 * Reject a submission
 */
router.post('/form/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // Get submission
    const submission = await databases.getDocument(
      config.databaseId,
      config.submissionsCollectionId,
      id
    );

    if (submission.status === 'rejected') {
      return res.status(400).json({ error: 'Submission already rejected' });
    }

    // Update submission status
    const updatedSubmission = await databases.updateDocument(
      config.databaseId,
      config.submissionsCollectionId,
      id,
      {
        status: 'rejected',
        adminMessage: message || 'Your submission has been rejected'
      }
    );

    return res.json({
      message: 'Submission rejected',
      submissionId: updatedSubmission.$id,
      status: 'rejected'
    });

  } catch (error) {
    console.error('Error rejecting submission:', error);
    return res.status(500).json({ error: 'Failed to reject submission' });
  }
});

export default router;

