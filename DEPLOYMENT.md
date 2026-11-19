# Production Deployment Guide &bull; Render & Railway

Your project repository in `C:\Users\SAI\.gemini\antigravity\scratch\prism-chat` has been fully configured and initialized with Git and all cloud deployment descriptors:
- `render.yaml` &mdash; Render Infrastructure-as-Code Blueprint
- `railway.json` & `Procfile` &mdash; Railway native deployment specification
- `Dockerfile` & `.dockerignore` &mdash; Container deployment for any cloud host
- `.gitignore` &mdash; Excludes node_modules, temp files, and uploads

---

## Option 1: Deploying to Render (Recommended &bull; 100% Free Tier)

Render provides automated HTTPS (SSL), WebSocket support, and cloud DDoS protection.

### Step 1: Push Project to GitHub
1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g. `lumina-workspace` or `prism-chat`).
2. Run these commands in your PowerShell / terminal:
   ```powershell
   cd C:\Users\SAI\.gemini\antigravity\scratch\prism-chat
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Connect to Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in.
2. Click **New +** &rarr; **Blueprints** (or **Web Service**).
3. Select your GitHub repository.
4. Render will automatically detect `render.yaml` and configure:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Auto HTTPS & Firewall:** Handled automatically
5. Click **Apply**. Within 1–2 minutes, your web app will be live at:
   `https://prism-workspace.onrender.com` (or your chosen name).

---

## Option 2: Deploying to Railway

Railway provides instantaneous deployment with low-latency WebSocket routing.

### Method A: Deploy via GitHub
1. Go to [railway.com](https://railway.com).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically pick up `railway.json` and `Procfile` and deploy your app.
5. In project settings, click **Generate Domain** to get a clean public URL (e.g. `https://prism-chat.up.railway.app`).
