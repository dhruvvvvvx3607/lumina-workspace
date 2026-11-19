# Prism &bull; Instagram-Style Stealth Secure Chat Web App

A private, vibrant, Instagram-style direct messaging web application disguised behind an innocent corporate workspace portal (**"Lumina Workspace"**). 

---

## 🌟 Key Features & Requirements Matrix

### 1. 🎭 Disguised Login & Sign-in (Camouflage Mode)
- **Zero Chat Reveal:** The authentication interface appears completely as **"Lumina Workspace"** (an enterprise cloud document, collaborative notes, and data vault application).
- Anyone viewing the login screen, browsing history, or looking over your shoulder sees a sleek note/document productivity suite.
- **Compulsory Sign Up:** Requires Email ID, **Unique Username** (handle), and Master Password.
- **Persistent Session:** Stays permanently logged in across browser closes, system reboots, and tabs until the user manually logs out or triggers the emergency Panic Button.

### 2. 🚨 Top-Left Emergency Panic Button
- Prominent **PANIC EXIT** button positioned at the top-left of the application header.
- **One-Click Instant Disconnect:**
  - Instantly wipes JWT tokens, user profiles, and active session memory.
  - Immediately cuts the real-time WebSocket connection.
  - Replaces history state and redirects to a blank/safe screen so the browser back button cannot restore the chat.
- **Emergency Shortcut:** Double-tapping `Escape` key (`Esc` + `Esc`) immediately triggers the panic exit.

### 3. 💬 Instagram-Style Direct Messaging (UI/UX)
- **User Discovery:** Search any user by their **unique `@username`** set during signup to initiate private 1-on-1 conversations.
- **100% Secured Direct Isolation:** Server-side access control guarantees that communication between two users is strictly isolated—no third user can ever view, intercept, or query other conversations.
- **Rich Media & Expressiveness:**
  - **Text Messaging:** Instant real-time typing indicators, delivery timestamps, and read receipts.
  - **Photos / Images:** Direct file upload with preview before sending, zoomable lightbox modal, and download link.
  - **Instagram Stickers:** Floating animated stickers (💖 Heart Pop, 🔥 Lit Fire, 💯 Keep it 100, 🥳 Party, ✨ Magic Spark, 🚀 To The Moon, etc.).
  - **Emoji Picker:** Categorized emoji drawer (Smileys, Hearts, Gestures, Vibes, Animals).
  - **Double-Tap Heart Reaction:** Double-clicking/double-tapping any message pops an animated ❤️ reaction badge on the bubble.

### 4. 🎨 Dynamic Themes & Custom Local Image Wallpaper
- **Built-in Vibrant Themes:**
  1. **Sunset Glow** &mdash; Classic Instagram fuchsia, rose, and amber gradient bubbles.
  2. **Cyber Neon** &mdash; Dark obsidian with glowing cyan & magenta neon accents.
  3. **Abstract Grid** &mdash; Deep indigo & purple with textured structural grid pattern.
  4. **Midnight Velvet** &mdash; Luxury matte violet and gold velvet aesthetic.
  5. **Emerald Dream** &mdash; Deep forest jade and mint glowing accents.
  6. **Ocean Wave** &mdash; Electric cyan and deep sapphire blue ripple gradient.
- **Custom Local Image Theme:**
  - Users can select **any locally saved image file** (`.jpg`, `.png`, `.webp`) from their computer or phone as the chat wallpaper.
  - Uses frosted glassmorphism overlays (`backdrop-filter: blur(12px)`) so text messages remain 100% legible over any wallpaper.

### 5. 👑 Master Administration Console (Total Control)
- **Admin Credentials:** Pre-configured master admin (`admin` / `AdminSecure2026!`).
- **User Management & Instant Discard:**
  - The admin has visibility over every registered user, their email, handle, joined date, and message activity.
  - **Discard User:** With one click, the admin can revoke and discard any user account at any time. When discarded, their active socket is booted immediately, and all future login/token attempts are blocked with HTTP 403 Forbidden.
  - **Restore User:** The admin can restore discarded users if needed.
- **Selective Real-Time Notifications:**
  - **Normal Users:** Standard users receive **NO audio, push, or intrusive notifications** for incoming messages to avoid alerting anyone nearby.
  - **Admin Exclusive Alerts:** The admin receives live audio chime alerts and a real-time supervision stream for all messaging traffic across the system.

---

## 🚀 Quick Start Guide

### 1. Start the Server
```powershell
cd C:\Users\SAI\.gemini\antigravity\scratch\prism-chat
node server.js
```

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Default Master Admin Account
- **Identifier:** `admin` (or `admin@stealth.io`)
- **Password:** `AdminSecure2026!`
- **Capabilities:** User discard/restore, live feed monitoring, system statistics.

### 4. User Testing
1. Click **"New Workspace Account"** on the disguised login page.
2. Sign up User A: e.g. email `sam@example.com`, username `sam_crypto`, password `Password123!`.
3. Open an Incognito window and sign up User B: e.g. `elena@example.com`, username `elena_star`, password `Password123!`.
4. User A searches `@elena_star` in the search box to begin private direct texting, sending images, stickers, and emojis!
