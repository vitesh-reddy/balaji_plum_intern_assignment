const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  const data = {
    status: 'ok',
    service: 'Plum OPD Adjudication API',
    timestamp: new Date().toISOString(),
    gemini_configured: isGeminiConfigured,
  };

  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Health Status</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-image: 
              radial-gradient(circle at top left, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
              radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2.5rem;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4), 0 0 20px rgba(99, 102, 241, 0.1);
          }
          .header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 1.5rem;
          }
          .icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #6366f1, #10b981);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 800;
            color: white;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }
          h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .service-name {
            color: #94a3b8;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.25rem;
          }
          .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .status-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          .label {
            color: #94a3b8;
            font-size: 0.9rem;
            font-weight: 500;
          }
          .value {
            font-weight: 600;
            font-size: 0.95rem;
          }
          .badge {
            padding: 0.35rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .badge-ok {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }
          .badge-warn {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="icon">P</div>
            <div>
              <h1>System Status</h1>
              <div class="service-name">${data.service}</div>
            </div>
          </div>
          
          <div class="status-row">
            <span class="label">API Status</span>
            <span class="badge badge-ok">Operational</span>
          </div>
          
          <div class="status-row">
            <span class="label">Gemini AI</span>
            <span class="badge ${data.gemini_configured ? 'badge-ok' : 'badge-warn'}">
              ${data.gemini_configured ? 'Connected' : 'Mock Mode'}
            </span>
          </div>
          
          <div class="status-row">
            <span class="label">Last Updated</span>
            <span class="value" style="color: #cbd5e1; font-variant-numeric: tabular-nums;">
              ${new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.json(data);
  }
});

module.exports = router;