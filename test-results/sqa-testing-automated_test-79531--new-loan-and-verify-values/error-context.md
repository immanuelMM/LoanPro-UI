# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sqa-testing\automated_test.spec.js >> LoanPro UI Core Features >> should create a new loan and verify values
- Location: sqa-testing\automated_test.spec.js:33:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#nlBor')
    - locator resolved to <select id="nlBor" class="form-control" onchange="updatePreview()">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    57 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - complementary [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - generic [ref=e10]: LoanPro
      - button "Toggle Sidebar" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
    - navigation [ref=e13]:
      - generic [ref=e14]: Main
      - link "Dashboard" [ref=e15] [cursor=pointer]:
        - /url: "#dashboard"
        - img [ref=e16]
        - generic [ref=e21]: Dashboard
      - link "Loans 2" [ref=e22] [cursor=pointer]:
        - /url: "#loans"
        - img [ref=e23]
        - generic [ref=e26]: Loans
        - generic [ref=e27]: "2"
      - link "Bank/Credit 0" [ref=e28] [cursor=pointer]:
        - /url: "#bank-loans"
        - img [ref=e29]
        - generic [ref=e31]: Bank/Credit
        - generic [ref=e32]: "0"
      - link "New Loan" [active] [ref=e33] [cursor=pointer]:
        - /url: "#new-loan"
        - img [ref=e34]
        - generic [ref=e36]: New Loan
      - generic [ref=e37]: People
      - link "Borrowers 2" [ref=e38] [cursor=pointer]:
        - /url: "#borrowers"
        - img [ref=e39]
        - generic [ref=e44]: Borrowers
        - generic [ref=e45]: "2"
      - link "New Borrower" [ref=e46] [cursor=pointer]:
        - /url: "#new-borrower"
        - img [ref=e47]
        - generic [ref=e50]: New Borrower
      - generic [ref=e51]: Finance
      - link "Due Payments 0" [ref=e52] [cursor=pointer]:
        - /url: "#notifications"
        - img [ref=e53]
        - generic [ref=e56]: Due Payments
        - generic [ref=e57]: "0"
      - link "Payments" [ref=e58] [cursor=pointer]:
        - /url: "#payments"
        - img [ref=e59]
        - generic [ref=e61]: Payments
      - link "Archive" [ref=e62] [cursor=pointer]:
        - /url: "#archive"
        - img [ref=e63]
        - generic [ref=e66]: Archive
      - link "Reports" [ref=e67] [cursor=pointer]:
        - /url: "#reports"
        - img [ref=e68]
        - generic [ref=e69]: Reports
      - link "Settings" [ref=e70] [cursor=pointer]:
        - /url: "#settings"
        - img [ref=e71]
        - generic [ref=e74]: Settings
    - generic [ref=e76]:
      - generic [ref=e77]: LP
      - generic [ref=e78]:
        - generic [ref=e79]: Loan Admin
        - generic [ref=e80]: Administrator
  - generic [ref=e81]:
    - banner [ref=e82]:
      - generic [ref=e84]: New Loan
      - generic [ref=e85]:
        - generic [ref=e86]: Thu, Jul 2, 2026
        - button "Toggle Light/Dark Mode" [ref=e87] [cursor=pointer]:
          - img [ref=e88]
        - button "Notifications" [ref=e90] [cursor=pointer]:
          - img [ref=e91]
    - main [ref=e94]:
      - generic [ref=e95]:
        - generic [ref=e97]:
          - heading "New Loan" [level=1] [ref=e98]
          - paragraph [ref=e99]: Create a new loan application.
        - generic [ref=e100]:
          - generic [ref=e101]:
            - generic [ref=e102]: Loan Details
            - generic [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]: Borrower *
                - combobox [ref=e106] [cursor=pointer]:
                  - option "— Select —" [selected]
                  - option "Maria Santos"
                  - option "Jose Reyes"
              - generic [ref=e107]:
                - generic [ref=e108]: Principal (PHP) *
                - spinbutton [ref=e109]
              - generic [ref=e110]:
                - generic [ref=e111]: Interest Rate (%) *
                - spinbutton [ref=e112]
              - generic [ref=e113]:
                - generic [ref=e114]: Term (months) *
                - spinbutton [ref=e115]
              - generic [ref=e116]:
                - generic [ref=e117]: Interest Type
                - combobox [ref=e118] [cursor=pointer]:
                  - option "Simple Interest" [selected]
                  - option "Reducing Balance"
              - generic [ref=e119]:
                - generic [ref=e120]: Start Date
                - textbox [ref=e121]: 2026-07-02
              - generic [ref=e122]:
                - generic [ref=e123]: Purpose
                - combobox [ref=e124] [cursor=pointer]:
                  - option "Business Capital" [selected]
                  - option "Education"
                  - option "Medical"
                  - option "Home Improvement"
                  - option "Personal"
                  - option "Other"
              - generic [ref=e125]:
                - generic [ref=e126]: Status
                - combobox [ref=e127] [cursor=pointer]:
                  - option "Active" [selected]
                  - option "Pending"
              - generic [ref=e128]:
                - generic [ref=e129]: Notes
                - textbox "Collateral, conditions..." [ref=e130]
            - generic [ref=e131]:
              - text: Borrower ID Attachments
              - generic [ref=e132]: (Optional)
            - generic [ref=e133]:
              - generic [ref=e134]:
                - generic [ref=e135]: ID Front
                - button "Choose File" [ref=e136]
              - generic [ref=e137]:
                - generic [ref=e138]: ID Back
                - button "Choose File" [ref=e139]
            - separator [ref=e140]
            - generic [ref=e141]:
              - button "Create Loan" [ref=e142] [cursor=pointer]
              - button "Cancel" [ref=e143] [cursor=pointer]
          - generic [ref=e144]:
            - generic [ref=e145]: Loan Preview
            - generic [ref=e146]: Fill in the form to preview.
  - generic:
    - generic:
      - generic:
        - heading [level=3]
        - button "×"
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('LoanPro UI Core Features', () => {
  4  |     
  5  |     test.beforeEach(async ({ page }) => {
  6  |         // Assuming the app is running on localhost:3000
  7  |         await page.goto('http://localhost:3000');
  8  |     });
  9  | 
  10 |     test('should register a new borrower', async ({ page }) => {
  11 |         // Navigate to New Borrower
  12 |         await page.click('#nav-new-borrower');
  13 |         
  14 |         // Fill form
  15 |         await page.fill('#nbN', 'John Doe');
  16 |         await page.fill('#nbPh', '0917-123-4567');
  17 |         await page.fill('#nbEm', 'john.doe@example.com');
  18 |         await page.fill('#nbGov', 'SSS-123-456');
  19 |         await page.fill('#nbAd', '123 Main St, Metro Manila');
  20 |         await page.fill('#nbNt', 'A test borrower profile.');
  21 | 
  22 |         // Submit
  23 |         await page.click('button:has-text("Register Borrower")');
  24 | 
  25 |         // Check success toast (assuming toast appears)
  26 |         // await expect(page.locator('.toast-success')).toBeVisible();
  27 |         
  28 |         // Check if borrower appears in table
  29 |         await page.click('#nav-borrowers');
  30 |         await expect(page.locator('table')).toContainText('John Doe');
  31 |     });
  32 | 
  33 |     test('should create a new loan and verify values', async ({ page }) => {
  34 |         // Wait for a borrower to exist (scenario above)
  35 |         // Navigate to New Loan
  36 |         await page.click('#nav-new-loan');
  37 |         
  38 |         // Select borrower
> 39 |         await page.selectOption('#nlBor', { label: 'John Doe' });
     |                    ^ Error: page.selectOption: Test timeout of 30000ms exceeded.
  40 |         
  41 |         // Fill loan details
  42 |         await page.fill('#nlAmt', '100000');
  43 |         await page.fill('#nlRate', '10');
  44 |         await page.fill('#nlTerm', '12');
  45 |         await page.selectOption('#nlType', 'simple');
  46 |         
  47 |         // Verify Preview updates
  48 |         const preview = page.locator('#lnPrev');
  49 |         await expect(preview).toContainText('Principal: ₱100,000.00');
  50 |         
  51 |         // Submit
  52 |         await page.click('button:has-text("Create Loan")');
  53 | 
  54 |         // Should be redirected to Loan Detail
  55 |         await expect(page.url()).toContain('#loan-detail');
  56 |         await expect(page.locator('.page-title')).toContainText('Loan Detail');
  57 |         await expect(page.locator('.detail-val')).toContainText('₱100,000.00');
  58 |     });
  59 | 
  60 |     test('should record a payment and update progress', async ({ page }) => {
  61 |         // Re-navigate to the newly created loan or use payments page
  62 |         await page.click('#nav-payments');
  63 |         
  64 |         // Select the loan
  65 |         await page.selectOption('#pyLoan', { index: 1 }); // Choosing first option for now
  66 |         
  67 |         // Fill amount
  68 |         await page.fill('#pyAmt', '10000');
  69 |         await page.fill('#pyNote', 'Initial repayment.');
  70 |         
  71 |         // Submit
  72 |         await page.click('button:has-text("Record Payment")');
  73 | 
  74 |         // Should be on payments page with recent payment listed
  75 |         await expect(page.locator('table')).toContainText('₱10,000.00');
  76 |     });
  77 | 
  78 |     test('should verify theme toggle', async ({ page }) => {
  79 |         const themeBtn = page.locator('#themeToggleBtn');
  80 |         const root = page.locator(':root');
  81 | 
  82 |         // Initial theme should likely be dark (based on styles.css)
  83 |         // Click to toggle
  84 |         await themeBtn.click();
  85 |         await expect(root).toHaveAttribute('data-theme', 'light');
  86 | 
  87 |         // Click again to toggle back
  88 |         await themeBtn.click();
  89 |         await expect(root).toHaveAttribute('data-theme', 'dark');
  90 |     });
  91 | 
  92 | });
  93 | 
```