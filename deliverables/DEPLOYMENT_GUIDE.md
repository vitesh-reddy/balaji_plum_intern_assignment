# Deployment Guide: Vercel Frontend + Render Backend

## 1. Push Project to GitHub

Vercel and Render deploy most easily from GitHub.

Make sure this folder is pushed:

```text
plum_intern_assignment/
  backend/
  frontend/
  render.yaml
```

## 2. Prepare MongoDB Atlas

Render will not have your local MongoDB, so use MongoDB Atlas.

1. Create a free cluster in MongoDB Atlas.
2. Create a database user.
3. Allow network access from anywhere for Render: `0.0.0.0/0`.
4. Copy the connection string.

Example:

```text
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/plum_opd?retryWrites=true&w=majority
```

## 3. Deploy Backend on Render

### Option A: Using `render.yaml`

1. Go to Render.
2. Click **New +**.
3. Choose **Blueprint**.
4. Connect the GitHub repo.
5. Render should detect `render.yaml`.
6. Add environment variables when prompted.

### Option B: Manual Render Web Service

Use these settings:

| Setting | Value |
|---|---|
| Service Type | Web Service |
| Runtime | Node |
| Root Directory | `backend` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

### Render Environment Variables

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Your Gemini API key |
| `FRONTEND_URL` | Your Vercel frontend URL, added after frontend deploy |

After deploy, Render will give a backend URL like:

```text
https://plum-opd-adjudication-backend.onrender.com
```

Your API base URL will be:

```text
https://plum-opd-adjudication-backend.onrender.com/api
```

Check:

```text
https://plum-opd-adjudication-backend.onrender.com/api/health
```

## 4. Deploy Frontend on Vercel

1. Go to Vercel.
2. Click **Add New Project**.
3. Import the GitHub repo.
4. Set the root directory to:

```text
frontend
```

Use these settings:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |

### Vercel Environment Variable

Add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-RENDER-BACKEND.onrender.com/api` |

Then deploy.

## 5. Connect Frontend and Backend

After Vercel deploys, copy your frontend URL:

```text
https://YOUR-VERCEL-PROJECT.vercel.app
```

Go back to Render and update:

```text
FRONTEND_URL=https://YOUR-VERCEL-PROJECT.vercel.app
```

Then redeploy/restart the Render service.

## 6. Final URLs

Frontend:

```text
https://YOUR-VERCEL-PROJECT.vercel.app
```

Backend:

```text
https://YOUR-RENDER-BACKEND.onrender.com/api
```

Health check:

```text
https://YOUR-RENDER-BACKEND.onrender.com/api/health
```

## Notes

- Render free services sleep after inactivity, so the first request can be slow.
- Uploaded files on Render free instances are ephemeral. For production, use S3, Cloudinary, or another persistent file store.
- JSON document uploads work for testing and skip OCR.
- The backend auto-seeds members if the MongoDB members collection is empty.
