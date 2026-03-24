const { test, expect } = require('@playwright/test');

test.describe('LoanPro UI Core Features', () => {
    
    test.beforeEach(async ({ page }) => {
        // Assuming the app is running on localhost:3000
        await page.goto('http://localhost:3000');
    });

    test('should register a new borrower', async ({ page }) => {
        // Navigate to New Borrower
        await page.click('#nav-new-borrower');
        
        // Fill form
        await page.fill('#nbN', 'John Doe');
        await page.fill('#nbPh', '0917-123-4567');
        await page.fill('#nbEm', 'john.doe@example.com');
        await page.fill('#nbGov', 'SSS-123-456');
        await page.fill('#nbAd', '123 Main St, Metro Manila');
        await page.fill('#nbNt', 'A test borrower profile.');

        // Submit
        await page.click('button:has-text("Register Borrower")');

        // Check success toast (assuming toast appears)
        // await expect(page.locator('.toast-success')).toBeVisible();
        
        // Check if borrower appears in table
        await page.click('#nav-borrowers');
        await expect(page.locator('table')).toContainText('John Doe');
    });

    test('should create a new loan and verify values', async ({ page }) => {
        // Wait for a borrower to exist (scenario above)
        // Navigate to New Loan
        await page.click('#nav-new-loan');
        
        // Select borrower
        await page.selectOption('#nlBor', { label: 'John Doe' });
        
        // Fill loan details
        await page.fill('#nlAmt', '100000');
        await page.fill('#nlRate', '10');
        await page.fill('#nlTerm', '12');
        await page.selectOption('#nlType', 'simple');
        
        // Verify Preview updates
        const preview = page.locator('#lnPrev');
        await expect(preview).toContainText('Principal: ₱100,000.00');
        
        // Submit
        await page.click('button:has-text("Create Loan")');

        // Should be redirected to Loan Detail
        await expect(page.url()).toContain('#loan-detail');
        await expect(page.locator('.page-title')).toContainText('Loan Detail');
        await expect(page.locator('.detail-val')).toContainText('₱100,000.00');
    });

    test('should record a payment and update progress', async ({ page }) => {
        // Re-navigate to the newly created loan or use payments page
        await page.click('#nav-payments');
        
        // Select the loan
        await page.selectOption('#pyLoan', { index: 1 }); // Choosing first option for now
        
        // Fill amount
        await page.fill('#pyAmt', '10000');
        await page.fill('#pyNote', 'Initial repayment.');
        
        // Submit
        await page.click('button:has-text("Record Payment")');

        // Should be on payments page with recent payment listed
        await expect(page.locator('table')).toContainText('₱10,000.00');
    });

    test('should verify theme toggle', async ({ page }) => {
        const themeBtn = page.locator('#themeToggleBtn');
        const root = page.locator(':root');

        // Initial theme should likely be dark (based on styles.css)
        // Click to toggle
        await themeBtn.click();
        await expect(root).toHaveAttribute('data-theme', 'light');

        // Click again to toggle back
        await themeBtn.click();
        await expect(root).toHaveAttribute('data-theme', 'dark');
    });

});
