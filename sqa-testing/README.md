# SQA Testing Folder

This folder contains the testing assets and documentation for the Loan Management System.

## Contents

- **[test_plan.md](test_plan.md)**: A comprehensive manual test plan covering core scenarios (Borrowers, Loans, Payments, Reports).
- **[automated_test.spec.js](automated_test.spec.js)**: A Playwright-based automated test script for regression testing.
- **[test_recording.webp](test_recording.webp)**: A full recording of the SQA walkthrough performed by the AI agent.
- **[reports_screenshot.png](reports_screenshot.png)**: Screenshot of the Reports dashboard in Dark Mode.
- **[light_mode_screenshot.png](light_mode_screenshot.png)**: Screenshot of the Reports dashboard in Light Mode.

## How to Test
1. **Manual Testing**: Follow the steps in `test_plan.md` using the local application.
2. **Automated Testing**: 
   - Ensure the app is running locally (e.g., `npx serve .`).
   - Install Playwright: `npm install -D @playwright/test`.
   - Run tests: `npx playwright test sqa-testing/automated_test.spec.js`.
