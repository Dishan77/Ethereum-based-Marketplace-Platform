# Frontend Structure & UI Elements

This document lists all the frontend pages, components, and their respective UI elements found in the codebase.

## Pages (Routes)

### 1. Home Page (`/`)
**File:** `src/App.js` (Component: `HomePage`)
- **Header:**
    - Title: "KALA 2.0"
    - Subtitle: "Blockchain-Based Artwork Marketplace"
- **Connect Wallet Section:**
    - Welcome Message
    - "Connect MetaMask" Button
- **Role Selection (after login):**
    - User Info (Address)
    - **Admin Card:** Icon, Title, Description
    - **Artist Card:** Icon, Title, Description
    - **Customer Card:** Icon, Title, Description
- **Footer:** Test Accounts Information

### 2. Admin Dashboard (`/admin`)
**File:** `src/components/AdminDashboard.js`
*(Based on file analysis, likely contains)*
- **User Management:** Tables/Lists to manage users.
- **Verification:** Tools to verify sellers/artists.
- **Platform Operations:** Overview of platform stats.

### 3. Seller Dashboard (`/seller`)
**File:** `src/components/SellerDashboard.js`
- **Header:** Welcome Message
- **Status Indicators:** Pending/Verified status alerts.
- **List New Artwork Form:**
    - Inputs: Artwork Name, Price (ETH), Description, Category (Select), Tags.
    - Image Upload: File input (Max 5), Image Previews with remove button.
    - Submit Button: "List Artwork"
- **My Artworks Section:**
    - Grid of listed items.
    - **Artwork Card:**
        - Title, Category, Views, Blockchain ID, Date.
        - Actions: "View QR Code", "Delete".

### 4. Customer Dashboard (`/customer`)
**File:** `src/components/CustomerDashboard.js`
- **Header:** Welcome Message
- **Navigation Tabs:** "Marketplace", "My Collection"
- **Marketplace Tab:**
    - **Search & Filter:**
        - Search Bar (Text input)
        - Category Filter (Dropdown)
        - Results Count
    - **Artwork Grid:**
        - **Artwork Card:**
            - Image (with Resale badge if applicable)
            - Title (Clickable)
            - Artist Name (Clickable -> Opens Profile)
            - Description (Truncated)
            - Category Tag
            - Price (ETH)
            - **Actions:** "Buy Now" Button, "History" Button
- **My Collection Tab:**
    - Grid of purchased items.
    - **Item Card:**
        - Name, Purchase Price, Original Seller, Ownership Changes.
        - **Actions:** "View History", "Resell" (if not sold), Status text.
- **Modals:**
    - **Ownership History Modal:** Timeline of owners, prices, and condition reports.

### 5. Artwork Detail (`/artwork/:id`)
**File:** `src/components/ArtworkDetail.js`
*(Detailed view of a specific artwork)*
- Likely contains full image, full description, history, and purchase options.

## Shared Components

### Navigation Bar
**File:** `src/App.js` (Component: `Navigation`)
- **Logo/Title:** "KALA 2.0"
- **Links:** Admin, Seller, Marketplace (conditionally rendered based on role).
- **User Section:** Name/Role, Address (truncated), "Logout" Button.

### Artist Registration Form
**File:** `src/components/ArtistRegistrationForm.js`
- Used in `SellerDashboard` for new sellers.
- Form fields for personal details, portfolio, bio, etc.

### Artist Profile Modal
**File:** `src/components/ArtistProfile.js`
- Used in `CustomerDashboard` when clicking an artist name.
- **Header:** Avatar, Name, Wallet Address, Verified Badge.
- **Details:** Registration info (Email, Location, etc.), Art Styles, Social Media links.
- **Bio Section**
- **Portfolio Images Grid**

### Resale Modal
**File:** `src/components/ResaleModal.js`
- Used for reselling items.
- **Form:**
    - New Price Input.
    - Condition Report Selects (Overall, Physical, Authenticity, Restoration, Storage).
    - Additional Notes Textarea.
    - Actions: "Cancel", "Resell with Condition Report".

## UI Elements Summary
- **Buttons:** Primary (Blue/Purple), Success (Green - Buy/Connect), Danger (Red - Delete/Logout), Warning (Yellow - Resell).
- **Inputs:** Text fields, Number inputs (ETH), Textareas, File uploads.
- **Cards:** Used for Role selection, Artworks, Dashboard items.
- **Modals:** Overlays for History, Artist Profile, Resale.
- **Badges/Tags:** Category tags, Status badges (Verified, Resale).

## Design System & UI Components

### Color Palette
The application currently uses a mix of inline styles and CSS.

**Primary Colors (Gradients & Brand):**
- **Main Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (Used in Home/Login)
- **Secondary Gradient:** `linear-gradient(135deg, #f4e4bc 0%, #d4a574 50%, #8b4513 100%)` (Defined in App.css body)
- **Brand Purple:** `#667eea`
- **Brand Dark Purple:** `#764ba2`

**Functional Colors:**
- **Action Blue:** `#007bff` (Buttons, Links, Active Tabs)
- **Success Green:** `#28a745` (Buy Buttons), `#10b981` (Seller Card), `#48bb78` (Verified Badge)
- **Danger Red:** `#dc3545` (Delete, Logout, Close)
- **Warning Yellow:** `#ffc107` (Resale Badge), `#fff3cd` (Backgrounds)
- **Info Teal:** `#17a2b8` (History Button)
- **Orange:** `#f97316` (Customer Card)

**Neutrals:**
- **Text Dark:** `#333333`, `#2d3748`
- **Text Gray:** `#666666`, `#718096`, `#6b7280`
- **Background Light:** `#f8f9fa`, `#f9fafb`, `#f0f4ff`, `#f0fdf4`, `#fef3f2`
- **Borders:** `#e2e8f0`, `#ddd`, `#ccc`

### Typography
- **Font Family:** `'Poppins', sans-serif` (App.css), System fonts fallback (index.css).
- **Headings:** Bold, often `#333` or `#2d3748`.
- **Body Text:** Generally 14px-16px, `#666` or `#4a5568`.

### UI Components

#### Buttons
- **Primary Button:**
  - Background: `#007bff` or `#667eea`
  - Text: White
  - Radius: `4px` - `8px`
  - Hover: Scale effect or darken
- **Secondary/Outline Button:**
  - Border: `#e2e8f0`
  - Background: White
- **Icon Buttons:** Circular close buttons (Red/Gray).

#### Cards
- **Dashboard Cards:**
  - Background: White
  - Border: `1px solid #ddd` or `#e2e8f0`
  - Radius: `8px` - `12px`
  - Shadow: `0 2px 8px rgba(0,0,0,0.1)` (on hover often increases)
- **Role Selection Cards:**
  - Interactive hover effects (border color change, lift up).
  - Large Emoji Icons.

#### Inputs & Forms
- **Text Inputs:**
  - Padding: `10px` - `12px`
  - Border: `1px solid #ccc` or `#e2e8f0`
  - Radius: `4px` - `6px`
  - Width: Often 100%
- **Select Dropdowns:** Styled similarly to text inputs.
- **File Upload:** Standard file input, often with a preview grid below.

#### Modals
- **Overlay:** `rgba(0, 0, 0, 0.7)`
- **Container:** White, Rounded (`12px`), Centered, Max-width `700px`-`800px`.
- **Close Button:** Absolute positioned top-right.

#### Navigation
- **Top Bar:**
  - Background: `#333` (App.js) or `rgba(255, 255, 255, 0.95)` (App.css - potentially conflicting)
  - Text: White (in App.js implementation)
  - Padding: `15px 30px`

