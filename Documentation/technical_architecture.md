# LoanPro — Technical Architecture

## Application Architecture
LoanPro is a single-page application (SPA) built using vanilla JavaScript, focusing on performance, simplicity, and ease of deployment.

### 1. Data Layer (`DB` Object)
The application uses a unified `DB` wrapper around the `localStorage` API. This ensures that all data (Borrowers, Loans, Payments, Activity Logs) is persistent across browser sessions.
- **`DB.get(k)`**: Retrieves and parses JSON data, returning an empty array if not found.
- **`DB.set(k, v)`**: Serializes and saves data as strings.
- **`save()`**: A central function to sync all global arrays (`borrowers`, `loans`, `payments`, `activity`) to the storage.

### 2. Router System
A lightweight routing logic is implemented using the `hashchange` event.
- **`register(hash, fn)`**: Maps a URL hash (e.g., `#new-loan`) to a page-rendering function.
- **`navigate(hash)`**: Handles partial updates to the `#contentArea` DOM element.
- **Dynamic Breadcrumbs**: Automatically updates the page title based on the active route.

### 3. Financial Engine (`calcLoan`)
The `calcLoan` function in `app.js` is the core of the system. It handles two interest types:
- **Simple Interest**: Interest is calculated once on the principal and divided by the term.
- **Reducing Balance (Compound)**: Standard amortized logic where interest is calculated monthly on the remaining balance (e.g., P * r * (1+r)^n / ((1+r)^n - 1)).

### 4. UI Rendering & Components
- **Vanilla DOM**: Pages are dynamically injected as HTML strings into the `contentArea`.
- **Modals & Toasts**: Reusable UI components for notifications and forms.
- **Responsive Design**: Custom CSS Media Queries ensure high usability on desktop and mobile.

### 5. PDF Generation (`jspdf`)
- Uses `jsPDF` and `autoTable` to convert JSON loan data into formatted official agreements.
- Includes headers, borrower signatures, and detailed amortization schedules.

### 6. Email Integration (`EmailJS`)
- Integrates with the `EmailJS` SDK.
- Automatically captures loan data into templates and sends them as HTML emails to borrowers.
- Supports PDF attachments by encoding them as Base64.
