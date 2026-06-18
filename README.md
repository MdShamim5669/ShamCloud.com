# ShamCloud ☁️
### Personal Digital Memory Vault and Cloud Media Archive Platform

**ShamCloud** is a secure, high-performance, full-stack media archive and digital memory vault web application. Built on **React 19**, **Vite**, and **Express.js**, it serves as a central hub for storing, organizing, and securing your most precious digital moments.

---

## ✨ Features

- 📸 **Memory Gallery**: Seamlessly drag-and-drop or select photos & videos to upload, preview, and categorize.
- 📁 **Organized Albums**: Group files into customized, elegant collections with easy search and dynamic metadata extraction.
- 👤 **Customizable Profile Settings**:
  - Update display names and secure email identifiers.
  - Choose from stunning pre-made artistic avatars, input custom URLs, or upload personalized picture files directly to your cloud instance.
- 📱 **Google Photos Integrator**: One-click configuration checking and streamlined importing of personal archives.
- 💻 **Admin Analytics Dashboard**: Gain insight into storage allocations, active users, system logs, and overall memory footprint in a clean visual layout.
- 💍 **Archival Tier Plans & Subscription Simulator**: Browse, choose, and configure server-simulated payment tiers suited for persistent file hosting.
- 🔒 **Ironclad Authentication & Validation**:
  - Secure registration and login flow.
  - **Secured Password Policy**: Requires a minimum of 8 characters, at least one alphabetical letter, at least one digit, and at least one special character (e.g., `!`, `@`, `#`, `$`, etc.) to protect digital archives from brute-force attempts.

---

## 🛠️ Tech Stack

**Frontend Framework:**
- **React 19** with TypeScript
- **Vite** for optimized assets and modules bundling
- **Tailwind CSS** for clean, responsive, utility-first aesthetics
- **Lucide React** for smooth, minimal vectorized iconography
- **Motion** for highly polished interface animations

**Backend Engine:**
- **Express.js** providing secure API routes, session handshakes, and disk integration
- **Multer** for reliable multipart form-data image uploading
- **esbuild** bundling the backend TypeScript server into a high-performance single file (`dist/server.cjs`) to escape ESM constraints

**Data & Integration Layers:**
- Local persistent JSON Databank (`db.json`)
- Google GenAI SDK ready for generative summaries
- Supabase Sync / Cloudinary hooks ready to scale your infrastructure

---

## 🚀 Quick Start

Ensure you have [Node.js](https://nodejs.org/) installed before starting.

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/shamcloud.git
cd shamcloud
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Your Environment Configuration
Create a `.env` file at the root of the project using the structure from `.env.example`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the App in Development Mode
To load both the backend API server and hot-module development environment:
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📦 Production Deployment & Build

To compile a highly optimized, unified package ready to deploy to Heroku, Cloud Run, AWS, or any Node-supported container/VPS platform:

```bash
# Compile client assets and bundle the Express server using esbuild
npm run build

# Boot up the compiled secure server on Port 3000
npm run start
```

---

## 📁 Key File Structure

```text
├── db.json                 # Core local database memory store
├── server.ts               # Full-stack backend Express.js server entrypoint
├── package.json            # Script definitions and dependency trees
├── vite.config.ts          # Core Vite plugins & bundling rules
├── uploads/                # Stores uploaded media files locally
└── src/
    ├── App.tsx             # Main view router & secure auth screen
    ├── index.css           # Global custom CSS & Tailwind import rules
    ├── types.ts            # Global TypeScript schemas & user interfaces
    └── components/
        ├── Dashboard.tsx   # Elegant dashboard grid & memory actions
        ├── ProfileView.tsx # Custom profile picture, presets & DDL helpers
        ├── AlbumsView.tsx  # Dynamic photo collections controller
        └── ...
```

---

## 🔐 Password Validation Criteria

When creating or modifying accounts, passwords are strictly parsed using secure regex validation:
1. **Length**: At least `8` characters.
2. **Alphabet**: At least `1` alphabetical letter (`[a-zA-Z]`).
3. **Number**: At least `1` numeric digit (`[0-9]`).
4. **Special Character**: At least `1` non-alphanumeric character (`[^a-zA-Z0-9]` like `@`, `$`, `!`, `%`, `%`, etc.).

---

## 🌍 License

Distributed under the MIT License. See `LICENSE` for more details.
