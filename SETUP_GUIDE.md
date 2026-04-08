# WoS SvS Planning Tracker — Complete Setup Guide

Everything you need to go from zero to a live web app.
No prior coding experience required.

---

## What you'll have when done

- A working web app that runs in any browser (desktop + mobile)
- 6 screens: Inventory Hub, Construction Planner, Hero Gear, Experts, War Academy, Alliance Scores
- All your spreadsheet data pre-loaded (Fire Crystals, RFC, Shards, Stones, Mithril, etc.)
- Auto-saves everything locally — your data survives page refreshes
- A public URL you can share with alliance members

**Time required:** ~30–45 minutes for first-time setup

---

## Part 1 — Install the tools you need (do this once)

### Step 1 — Install Node.js

Node.js is the engine that runs your app on your computer.

1. Open your browser and go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** (this means "Long Term Support" — the stable version)
3. Download the installer for your computer (Windows `.msi` or Mac `.pkg`)
4. Run the installer — click "Next" through all the steps, keeping all defaults
5. When it finishes, open a **Terminal** (Mac) or **Command Prompt** (Windows)

   - **Mac:** Press `Cmd + Space`, type `Terminal`, press Enter
   - **Windows:** Press the Windows key, type `cmd`, press Enter

6. Type this and press Enter to confirm Node installed:
   ```
   node --version
   ```
   You should see something like `v20.11.0`. If you do, Node is installed.

---

### Step 2 — Create a GitHub account

GitHub stores your code and connects to your hosting.

1. Go to: **https://github.com**
2. Click **"Sign up"** (top right)
3. Enter your email, create a password, choose a username
4. Verify your email address
5. On the welcome screen, you can skip all the optional steps

---

### Step 3 — Create a Vercel account

Vercel publishes your app to the internet for free.

1. Go to: **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** — this links your two accounts together
4. Authorize Vercel to access your GitHub

---

## Part 2 — Set up the project on your computer

### Step 4 — Download the app code

You downloaded a ZIP file called `wos-svs-tracker.zip` from Claude. Now unzip it.

- **Mac:** Double-click the ZIP file — it automatically unzips to a folder called `wos-svs-tracker`
- **Windows:** Right-click the ZIP file → "Extract All" → click Extract

Put the `wos-svs-tracker` folder somewhere easy to find, like your Desktop or Documents folder.

---

### Step 5 — Open the project in Terminal

You need to "navigate" Terminal into your project folder.

**On Mac:**
1. Open Terminal (`Cmd + Space` → type `Terminal` → Enter)
2. Type `cd ` (with a space after it — don't press Enter yet)
3. Open Finder, find your `wos-svs-tracker` folder
4. Drag the `wos-svs-tracker` folder into the Terminal window
5. The path fills in automatically — now press Enter

**On Windows:**
1. Open File Explorer and find your `wos-svs-tracker` folder
2. Click inside the folder's address bar at the top (where it shows the path)
3. Type `cmd` and press Enter — a Command Prompt opens already inside the folder

**Verify it worked** by typing:
```
dir
```
(Windows) or:
```
ls
```
(Mac)

You should see files listed including `package.json`, `index.html`, and a `src` folder. If you see those, you're in the right place.

---

### Step 6 — Install the app's dependencies

Your app uses code written by other developers (React, Vite). This step downloads them.

In your Terminal (still inside the `wos-svs-tracker` folder), type:
```
npm install
```
Press Enter. You'll see a progress indicator. Wait for it to finish — it usually takes 30–60 seconds. When it's done, you'll see your cursor return.

> **What just happened?** npm ("Node Package Manager") read the `package.json` file and downloaded everything the app needs into a folder called `node_modules`. You don't need to touch that folder — it's automatic.

---

### Step 7 — Run the app on your computer

Still in Terminal, type:
```
npm run dev
```
Press Enter. You'll see output like this:
```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Now open your browser and go to: **http://localhost:5173**

**Your app is running!** You should see the WoS SvS Planning Tracker with the dark theme, sidebar, and all your spreadsheet data loaded.

> To stop the app later: go back to Terminal and press `Ctrl + C`

---

## Part 3 — Customize your data

### Step 8 — Update your inventory numbers

The app comes pre-loaded with the values from your spreadsheet. To update them:

1. With the app open in your browser, click **"Inventory"** in the sidebar
2. Click on any number in the input fields and type your current value
3. Changes are saved automatically — you'll see "auto-saved [time]" in the top right

Every other screen (Construction, Hero Gear, etc.) reads from the Inventory screen, so updating here updates everything.

---

### Step 9 — (Optional) Edit the source data

For bigger changes — like adding new heroes or changing building requirements — you edit the code directly.

1. Open the `wos-svs-tracker` folder in a text editor. The free option is **VS Code**:
   - Download at: https://code.visualstudio.com
   - Install it, then: File → Open Folder → select `wos-svs-tracker`

2. In VS Code, open `src/App.jsx`

3. The data is near the top in clearly labeled sections:

   ```javascript
   // Change your starting inventory:
   const INITIAL_INVENTORY = {
     fireCrystals:   2982,   // ← change this number
     refinedFC:      34,     // ← and this one
     mithril:        74,
     // ... etc
   };
   ```

   ```javascript
   // Change building requirements:
   const fc10buildings = [
     { name: "Furnace", fc: 2835, rfc: 600 },
     // ... etc
   ];
   ```

4. Save the file (`Ctrl+S` / `Cmd+S`) — the browser auto-refreshes instantly

---

## Part 4 — Publish to the internet

### Step 10 — Create a GitHub repository

A "repository" (repo) is where your code lives on GitHub.

1. Go to **https://github.com** and log in
2. Click the **"+"** button (top right) → **"New repository"**
3. Fill in:
   - Repository name: `wos-svs-tracker`
   - Description: `WoS SvS Planning Tracker`
   - Set to **Public** (required for free Vercel hosting)
   - Do NOT check "Add a README" (your folder already has files)
4. Click **"Create repository"**
5. GitHub shows you a page with instructions. Look for the section that says **"…or push an existing repository from the command line"** and copy those commands — they'll look like:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/wos-svs-tracker.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 11 — Upload your code to GitHub

In your Terminal (still in the `wos-svs-tracker` folder):

**First, initialize Git** (Git is the system that tracks code changes):
```
git init
```

**Stage all your files:**
```
git add .
```
(The dot means "everything in this folder")

**Create your first save point:**
```
git commit -m "Initial commit — WoS SvS Tracker"
```

**Paste the commands from Step 10** (the ones GitHub showed you):
```
git remote add origin https://github.com/YOUR-USERNAME/wos-svs-tracker.git
git branch -M main
git push -u origin main
```

It will ask for your GitHub username and password. For the password, you need a **Personal Access Token** (GitHub no longer accepts your actual password):

1. On GitHub, click your profile picture → Settings
2. Scroll down to **Developer settings** (bottom of left sidebar)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token (classic)**
5. Give it a name like "wos-tracker", check the **repo** checkbox, click Generate
6. **Copy the token immediately** — GitHub only shows it once
7. Paste that token as your "password" in Terminal

After pushing, go to `https://github.com/YOUR-USERNAME/wos-svs-tracker` — your code is now on GitHub.

---

### Step 12 — Deploy to Vercel

1. Go to **https://vercel.com** and log in
2. Click **"Add New Project"**
3. Under "Import Git Repository", you'll see `wos-svs-tracker` — click **"Import"**
4. Vercel auto-detects it's a Vite project. Don't change any settings.
5. Click **"Deploy"**
6. Wait ~60 seconds. Vercel builds and deploys your app.
7. When it finishes, you get a URL like: `https://wos-svs-tracker.vercel.app`

**That's your live app.** Share this link with anyone in your alliance — it works on mobile too.

---

## Part 5 — Updating your app in the future

Every time you make changes to the code:

```
git add .
git commit -m "describe what you changed"
git push
```

Vercel automatically detects the push and re-deploys your app within ~60 seconds. No other steps needed.

---

## Troubleshooting

**"npm is not recognized" / "node is not found"**
→ Node didn't install correctly. Try restarting your Terminal/Command Prompt after installing. If still broken, reinstall Node from nodejs.org.

**The browser shows a blank page**
→ Make sure the Terminal is still running `npm run dev`. Check if it shows any red error messages.

**"Permission denied" on Mac**
→ Type `sudo npm install` instead, then enter your Mac password when prompted.

**"Port 5173 is already in use"**
→ Another app is using that port. Type `npm run dev -- --port 3000` to use port 3000 instead, then visit http://localhost:3000.

**Vercel deploy fails**
→ Make sure `vercel.json` is in your project folder. Check Vercel's deploy log for the specific error message.

**My inventory numbers reset when I refresh**
→ The app saves to your browser's localStorage. This is per-device — each device/browser keeps its own data. For shared data across devices, the next step is adding a database (ask Claude for help with that!).

---

## File structure reference

```
wos-svs-tracker/
├── src/
│   ├── App.jsx       ← ALL the app code lives here
│   └── main.jsx      ← Entry point (don't edit this)
├── index.html        ← HTML shell (don't edit this)
├── package.json      ← Dependencies list
├── vite.config.js    ← Build configuration
├── vercel.json       ← Hosting configuration
└── .gitignore        ← Files Git ignores
```

The only file you'll ever need to edit is **`src/App.jsx`**.

---

## What to build next

Once this is running, ask Claude to help you add:

1. **More heroes** — add entries to the `HEROES` array in App.jsx
2. **RFC refining calendar** — the day-by-day refine tier table from your FC10 sheet
3. **Push notifications** — remind you when president skills need rotating
4. **Alliance member tracking** — each member's contribution to the SvS score
5. **Cloud sync** — store data in Supabase so it syncs across all your devices
6. **Dark/light mode toggle** — already has CSS variables set up for it

---

*Generated from your WOS_-_SvS_Planning_Calc.xlsx workbook*
*All starting values match your spreadsheet data*
