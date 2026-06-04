const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const claimsRoutes = require('./routes/claims');
const membersRoutes = require('./routes/members');
const policyRoutes = require('./routes/policy');
const healthRoutes = require('./routes/health');
const morgan = require('morgan');
const coldStartSimulator = require('./middleware/coldStart');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cold Start Simulator Middleware (Dev Mode Only)
app.use(coldStartSimulator);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use(morgan("tiny"));
app.use('/api/claims', claimsRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    
    // Auto-seed if database is empty
    const Member = require('./models/Member');
    const memberCount = await Member.countDocuments();
    if (memberCount === 0) {
      console.log('Empty database detected. Running auto-seed...');
      const { seedDatabase } = require('./seedData');
      // Seed inline (DB already connected)
      const { members } = require('./seedData');
      await Member.insertMany(members);
      console.log(`✅ Auto-seeded ${members.length} members`);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Plum OPD Adjudication Server running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️ Not configured (mock mode)'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
