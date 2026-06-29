import 'dotenv/config'; // reload .env
import mongoose from 'mongoose';
import app from './app';
import { initRedis } from './utils/redis';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarnpublication';

async function start() {
  try {
    // Init Redis (graceful — won't crash on failure)
    initRedis();

    // Connect MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected to', MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`[Server] SwarnPublication API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Startup failed:', err);
    process.exit(1);
  }
}

start();
