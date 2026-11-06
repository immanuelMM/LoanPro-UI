# Hiramo — Data Schemas

## Data Management
All data is stored in the browser's `localStorage` as JSON strings.

### 1. Borrower Schema (`lp_borrowers`)
```json
{
  "id": "u43j2o8m",
  "name": "Jane Doe",
  "phone": "0917-123-4567",
  "email": "jane@example.com",
  "govId": "SSS-123-456",
  "address": "123 Main St, Metro Manila",
  "notes": "A test borrower profile.",
  "createdAt": "2026-03-20T09:05:14.125Z"
}
```

### 2. Loan Schema (`lp_loans`)
```json
{
  "id": "v54k2p9n",
  "borrowerId": "u43j2o8m",
  "principal": 50000,
  "rate": 12,
  "term": 6,
  "type": "simple",
  "startDate": "2026-03-20",
  "dueDate": "2026-09-20",
  "purpose": "Business Capital",
  "notes": "No collateral required.",
  "status": "active",
  "totalInterest": 3000,
  "monthlyPayment": 8833.33,
  "totalAmount": 53000,
  "schedule": [
    { "period": 1, "payment": 8833.33, "principal": 8333.33, "interest": 500, "balance": 44166.67 }
  ],
  "createdAt": "2026-03-20T09:10:00.125Z"
}
```

### 3. Payment Schema (`lp_payments`)
```json
{
  "id": "p65l3q0o",
  "loanId": "v54k2p9n",
  "amount": 5000,
  "date": "2026-03-21",
  "note": "Initial repayment.",
  "createdAt": "2026-03-21T10:00:00.125Z"
}
```
Penalty payments carry `"kind": "penalty"`; they reduce the penalty due, not the loan balance.

### Late Payment Penalty
Each installment still unpaid a full week after its due date (plus `penalty_grace_days`) is charged a
penalty, and again for every further week it stays unpaid. Charges are computed from payment history
(not stored). Loans may carry `penaltyWaived` (amount waived) and `closedAt` (penalties stop accruing then).

### 4. Activity Schema (`lp_activity`)
```json
{
  "id": "a76m4r1p",
  "type": "loan",
  "msg": "Loan of ₱50,000.00 created for Jane Doe",
  "date": "2026-03-20T09:10:00.125Z"
}
```

### 5. Settings Schema (`lp_settings`)
```json
{
  "emailjs_service": "default_service",
  "emailjs_template": "template_53kpkj7",
  "emailjs_public_key": "QsV4vGpnW4fLkBGMU",
  "auto_send": true,
  "penalty_enabled": true,
  "penalty_type": "percent",
  "penalty_rate": 5,
  "penalty_grace_days": 0
}
```
`penalty_type` is `percent` (% of the unpaid installment per week) or `fixed` (PHP per installment per week).
