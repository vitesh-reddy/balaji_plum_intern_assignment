const SERVER_START_TIME = Date.now();
const COLD_START_DURATION = 30 * 1000; // 30 seconds

const coldStartSimulator = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const uptime = Date.now() - SERVER_START_TIME;
  console.log(`[Cold Start Check] Request to ${req.url} | Uptime: ${Math.round(uptime / 1000)}s / ${COLD_START_DURATION / 1000}s`);
  
  if (uptime < COLD_START_DURATION) {
    const remainingTime = COLD_START_DURATION - uptime;
    console.log(`[Cold Start Simulator] Holding request ${req.method} ${req.url} for ${Math.round(remainingTime / 1000)}s`);
    setTimeout(() => {
      next();
    }, remainingTime);
  } else {
    next();
  }
};

module.exports = coldStartSimulator;