# LoanPro — Introduction

## Overview
LoanPro is a lightweight, high-performance **Loan Management System** designed for individual lenders and small finance organizations. It provides a central hub to manage borrowers, track loan applications, record repayments, and visualize financial performance.

## Key Features
- **Borrower Management**: Register and organize profiles with detailed contact and government ID information.
- **Dynamic Loan Creation**: Issue loans with customized principal amounts, interest rates (Simple or Reducing Balance), and terms.
- **Amortization Engine**: Automatically generates monthly payment schedules, interest breakdowns, and maturity dates.
- **Financial Tracking**: Log repayments against active loans with real-time balance updates and progress visualization.
- **Dashboard & Reports**: Interactive charts (powered by Chart.js) showing status breakdowns, collection trends, and outstanding balances.
- **PDF & Email Integration**: Generate official loan agreements in PDF and automatically notify borrowers via EmailJS.

## Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (SPA Architecture).
- **Styling**: Premium custom CSS with Dark/Light mode support.
- **Data Persistence**: `localStorage` (Client-side localized DB).
- **Libraries**:
  - `Chart.js`: Data visualization.
  - `jspDF`: PDF generation.
  - `EmailJS`: Automated email notifications.
