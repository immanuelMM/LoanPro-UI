# SQA Test Plan: Loan Management System

## Objective
To verify the core functionality of the LoanPro UI, including borrower registration, loan creation, payment recording, and reporting.

## Test Scenarios

### 1. Borrower Management
- **Scenario 1.1: Register New Borrower**
  - Navigate to "New Borrower".
  - Enter name, phone, email, and address.
  - Submit the form.
  - Expected: Borrower appears in the "Borrowers" list and a success toast is shown.
- **Scenario 1.2: Edit Borrower**
  - Select an existing borrower.
  - Modify their details.
  - Expected: Details are updated correctly in the list.
- **Scenario 1.3: Delete Borrower**
  - Attempt to delete a borrower with active loans (should be blocked).
  - Delete a borrower with no loans.
  - Expected: Borrower is removed from the list.

### 2. Loan Management
- **Scenario 2.1: Create New Loan**
  - Navigate to "New Loan".
  - Select a borrower.
  - Enter principal, interest rate, and term.
  - Verify "Loan Preview" updates dynamically.
  - Submit the form.
  - Expected: Loan is created, amortization schedule is generated, and user is redirected to the detail page.
- **Scenario 2.2: View Loan Details**
  - Click on a loan from the dashboard or loans list.
  - Verify amortization schedule, summary, and progress bar.
- **Scenario 2.3: Generate PDF**
  - Click "Download PDF" on the loan detail page.
  - Expected: PDF with the agreement and schedule is generated.

### 3. Repayment System
- **Scenario 3.1: Record Payment**
  - Navigate to "Payments".
  - Select a loan.
  - Enter payment amount and date.
  - Submit the form.
  - Expected: Payment is recorded, outstanding balance decreases, and receipt is generated.
- **Scenario 3.2: Verify Progress Bar**
  - Check the loan detail page after a payment.
  - Expected: Progress bar reflect the percentage paid.

### 4. Dashboards & Reports
- **Scenario 4.1: KPI Verification**
  - Check Total Loaned, Outstanding, and Collected counts on the Dashboard.
  - Expected: Values match the sum of actual data.
- **Scenario 4.2: Chart Verification**
  - Navigate to "Reports".
  - Verify that charts (Status Breakdown, Monthly Collections) are rendered.

### 5. Theme & UI
- **Scenario 5.1: Theme Toggle**
  - Click the moon/sun icon in the top bar.
  - Expected: UI switches between Light and Dark modes.
- **Scenario 5.2: Sidebar Toggle**
  - Toggle the sidebar collapse.
  - Expected: Sidebar collapses/expands correctly.
