import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import formRoutes from './routes/form.js';
import adminRoutes from './routes/admin.js';
import itineraryRoutes from './routes/itinerary.js';
import adminItineraryRoutes from './routes/adminItinerary.js';
import testPdfRoutes from './routes/testPdf.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/form', formRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/admin', adminItineraryRoutes);

// Development/Testing routes (consider removing in production)
app.use('/api/test', testPdfRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



