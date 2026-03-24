# LoanPro — User Guide

## Getting Started
To begin using LoanPro, simply open the `index.html` file in any modern browser. All data is stored locally in your browser's storage (`localStorage`), so no server installation is required.

---

## 1. Managing Borrowers
1.  **Registering**: Go to **New Borrower** in the sidebar. Fill in the name, phone, email, and address. Click **Register Borrower**.
2.  **Viewing**: The **Borrowers** page lists all registered profiles. Use the search bar to find specific entries.
3.  **Editing**: Click the pencil icon (✎) to update details like contact info.

## 2. Issuing Loans
1.  **Creation**: Go to **New Loan**.
2.  **Configuration**:
    - Select a borrower.
    - Set the **Principal** (e.g., 50,000 PHP).
    - Set the **Interest Rate** and **Term** (months).
    - Choose the **Interest Type** (Simple Interest vs. Reducing Balance).
3.  **Preview**: The **Loan Preview** updates in real-time as you type, showing the total repayable amount and monthly installment.
4.  **Submission**: Click **Create Loan**. You will be redirected to the **Loan Detail** page.

## 3. Tracking Repayments
1.  **Recording**: On the **Payments** page or the specific **Loan Detail** page, click **Record Payment**.
2.  **Details**: Enter the amount and date.
3.  **Impact**: The system automatically updates the **Outstanding Balance** and advances the **Progress Bar**.

## 4. Reports & Analytics
- The **Dashboard** provides a high-level summary of total loaned vs. total collected.
- The **Reports** page offers deeper insights into:
  - **Loan Status Breakdown** (Active, Overdue, Paid).
  - **Monthly Collections** over time.
  - **Volume by Purpose** (Education, Business, etc.).

## 5. Settings
- Configure your **EmailJS** keys to enable automatic email notifications.
- Toggle between **Light and Dark Mode** using the theme icon in the top bar.
