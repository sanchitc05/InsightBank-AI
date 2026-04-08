# 🏦 Bank Statement Analyzer — Master Prompt (Phase-by-Phase)
> Give each phase block to Antigravity as a separate prompt. Complete and verify each phase before moving to the next.

---

## CONTEXT (Include this at the top of every phase prompt)

```
You are helping me build a full-stack web application called "Bank Statement Analyzer."
It allows users to upload multi-bank PDF statements, extract and store transaction data,
visualize financial trends, and generate AI-powered insights.

Stack:
- Frontend: React 18 + Vite 5, Recharts, Axios, React Router DOM v6, React Dropzone, Tailwind CSS
- Backend: Python FastAPI + Uvicorn
- Database: MySQL 8 with SQLAlchemy 2.0 ORM + Alembic migrations
- PDF Parsing: pdfplumber, camelot-py, PyPDF2
- Analytics: pandas, numpy, scikit-learn, fuzzywuzzy
- Base URL for API: http://localhost:8000/api/v1
- Frontend dev server: http://localhost:5173
```

---

## ═══ PHASE 1 — Project Foundation & Environment Setup ═══

```
PHASE 1 GOAL: Scaffold both the frontend and backend projects with all dependencies
installed, folder structures created, environment files configured, and the MySQL
database initialized. Nothing should be hardcoded — all secrets go in .env files.

────────────────────────────────────────────────
BACKEND TASKS:
────────────────────────────────────────────────

1. Create the following folder structure under backend/:
   backend/
   ├── app/
   │   ├── main.py              ← FastAPI entry point
   │   ├── database.py          ← SQLAlchemy engine + session
   │   ├── models/
   │   │   ├── statement.py
   │   │   └── transaction.py
   │   ├── routers/
   │   │   ├── statements.py
   │   │   ├── transactions.py
   │   │   └── insights.py
   │   ├── parsers/
   │   │   ├── base_parser.py
   │   │   ├── sbi_parser.py
   │   │   ├── hdfc_parser.py
   │   │   ├── icici_parser.py
   │   │   └── parser_factory.py
   │   ├── analytics/
   │   │   ├── categorizer.py
   │   │   ├── insights_engine.py
   │   │   └── trend_analyzer.py
   │   └── schemas/             ← Pydantic models
   ├── schema.sql
   ├── requirements.txt
   └── .env

2. requirements.txt must include:
   fastapi, uvicorn, pdfplumber, pypdf2, camelot-py, pandas, numpy,
   sqlalchemy, pymysql, python-dotenv, python-multipart, scikit-learn,
   fuzzywuzzy, alembic

3. .env file structure:
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=bank_analyzer
   UPLOAD_DIR=./uploads

4. database.py: Set up SQLAlchemy engine using DATABASE_URL from .env,
   create a SessionLocal factory, and a Base declarative model.

5. main.py: Initialize FastAPI app, add CORSMiddleware allowing origin
   http://localhost:5173, include all routers under /api/v1 prefix.

6. schema.sql: Write the full MySQL schema with these four tables:

   a) statements (id PK, bank_name, account_number, month INT, year INT,
      file_name, uploaded_at DATETIME DEFAULT NOW(), total_credit DECIMAL(12,2),
      total_debit DECIMAL(12,2), UNIQUE KEY on bank_name+account_number+month+year)

   b) transactions (id PK, statement_id FK → statements.id ON DELETE CASCADE,
      txn_date DATE, description TEXT, debit DECIMAL(12,2), credit DECIMAL(12,2),
      balance DECIMAL(14,2), category VARCHAR(50) DEFAULT 'Uncategorized',
      merchant VARCHAR(100), INDEX on txn_date and category)

   c) categories (id PK, name VARCHAR(50), keywords JSON, color VARCHAR(10), icon VARCHAR(10))

   d) insights (id PK, statement_id FK → statements.id, type ENUM('anomaly','pattern','tip'),
      title VARCHAR(120), body TEXT, severity ENUM('info','warn','alert'),
      created_at DATETIME DEFAULT NOW())

   Pre-populate the categories table with at least 10 rows covering:
   Food, Rent, Utilities, Shopping, EMI, Salary, Transport, Entertainment,
   Healthcare, Education — each with relevant keywords JSON array, a hex color, and an emoji.

────────────────────────────────────────────────
FRONTEND TASKS:
────────────────────────────────────────────────

1. Scaffold with: npm create vite@latest frontend -- --template react

2. Install: recharts axios react-router-dom react-dropzone date-fns
   Dev install: tailwindcss postcss autoprefixer

3. Create this folder structure under frontend/src/:
   components/
     Navbar.jsx, UploadCard.jsx, StatementList.jsx,
     TransactionTable.jsx, MonthPicker.jsx, InsightCard.jsx
   charts/
     IncomeExpenseBar.jsx, CategoryPie.jsx, BalanceLine.jsx, SpendHeatmap.jsx
   pages/
     Dashboard.jsx, Upload.jsx, Transactions.jsx, Insights.jsx, Compare.jsx
   hooks/
     useStatements.js, useInsights.js
   services/
     api.js   ← axios wrapper with all API calls

4. .env file:
   VITE_API_URL=http://localhost:8000/api/v1

5. App.jsx: Set up React Router with routes for /, /upload, /transactions,
   /insights/:id, and /compare. Include Navbar on every page.

6. services/api.js: Create an axios instance with baseURL from
   import.meta.env.VITE_API_URL. Export these named functions:
   uploadStatement(file, onProgress), getStatements(), getStatement(id),
   deleteStatement(id), getTransactions(params), getAnalyticsSummary(id),
   getCategories(id), getTrend(bankName?), getCompare(id1, id2),
   getInsights(id), generateInsights(id)

DELIVERABLE: Both servers should start without errors.
Backend: uvicorn app.main:app --reload --port 8000
Frontend: npm run dev (opens at localhost:5173)
```

---

## ═══ PHASE 2 — PDF Parsing Engine (Multi-Bank) ═══

```
PHASE 2 GOAL: Build the complete PDF parsing pipeline — bank detection,
per-bank parsers, and the upload API endpoint that stores parsed
transactions into MySQL.

────────────────────────────────────────────────
BACKEND — parsers/base_parser.py:
────────────────────────────────────────────────
Create an abstract base class BaseParser with:
- parse(pdf_path: str) → pd.DataFrame
  Opens PDF with pdfplumber, iterates all pages, calls parse_table() on each table found
- Abstract method parse_table(table) → list[dict]
- Helper clean_amount(val: str) → float
  Strips commas, ₹ symbol, and whitespace; returns 0.0 on empty/null
- Helper parse_date(val: str) → date
  Tries multiple date formats: dd/mm/yyyy, dd-mm-yyyy, dd MMM yyyy

────────────────────────────────────────────────
BACKEND — parsers/parser_factory.py:
────────────────────────────────────────────────
- detect_bank(pdf_path) → str
  Open first page with pdfplumber, extract text, check for these strings (case-insensitive):
  "STATE BANK OF INDIA" → "SBI"
  "HDFC BANK" → "HDFC"
  "ICICI BANK" → "ICICI"
  "AXIS BANK" → "AXIS"
  "KOTAK" → "KOTAK"
  fallback → "GENERIC"

- get_parser(bank: str) → BaseParser instance
  Returns correct parser class. Fallback to HDFCParser for GENERIC.

────────────────────────────────────────────────
BACKEND — per-bank parsers:
────────────────────────────────────────────────

sbi_parser.py:
  SBI tables have columns: Txn Date | Description | Ref No | Debit | Credit | Balance
  parse_table: skip header rows (where first cell contains "Date" or is empty),
  map columns by index position 0,1,3,4,5

hdfc_parser.py:
  HDFC PDFs often render as plain text rather than structured tables.
  Primary: try pdfplumber extract_tables(), map Date|Narration|Chq|Withdrawal Amt|Deposit Amt|Closing Balance
  Fallback: use page.extract_text() line-by-line with this regex:
  r'(\d{2}/\d{2}/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})'

icici_parser.py:
  Columns: Date | Transaction Remarks | Amount (INR) | Type (Dr/Cr) | Balance (INR)
  Detect Dr/Cr from the Type column to split into debit/credit fields.

────────────────────────────────────────────────
BACKEND — routers/statements.py:
────────────────────────────────────────────────

POST /api/v1/statements/upload
  - Accept: multipart/form-data with field "file" (PDF)
  - Save file to UPLOAD_DIR with a UUID filename
  - Call detect_bank() and get_parser()
  - Call parser.parse(saved_path) → DataFrame
  - Extract account_number from first-page text using regex (last 4 digits visible)
  - Compute total_credit and total_debit from the DataFrame
  - INSERT into statements table
  - INSERT all rows into transactions table (deduplicate: skip if same statement_id+date+description+debit already exists)
  - Return: { statement_id, bank_name, month, year, total_transactions, total_credit, total_debit }

GET /api/v1/statements
  - Return list of all statements ordered by year desc, month desc
  - Each item: id, bank_name, account_number, month, year, total_credit, total_debit, uploaded_at

GET /api/v1/statements/{id}
  - Return single statement detail with the above fields

DELETE /api/v1/statements/{id}
  - Delete from statements (transactions cascade automatically)
  - Return: { message: "Deleted successfully" }

────────────────────────────────────────────────
FRONTEND — Upload.jsx + UploadCard.jsx:
────────────────────────────────────────────────
- UploadCard.jsx: Drag-and-drop zone using react-dropzone (accept only PDFs)
  Show file name preview once dropped. Upload progress bar (0–100%).
  On success: show green toast "Statement uploaded successfully!"
  On error: show red toast with error message from API response.

- Upload.jsx page: Render UploadCard, and below it a StatementList showing
  all previously uploaded statements (fetched via getStatements()).
  Each statement row shows: bank name badge, month/year, total credit (green),
  total debit (red), and a delete button with confirmation.

DELIVERABLE: Upload a real SBI or HDFC bank PDF. It should parse and store
transactions, and the statement should appear in the list with correct totals.
```

---

## ═══ PHASE 3 — Transaction Management & Auto-Categorization ═══

```
PHASE 3 GOAL: Build the transaction browsing UI and the auto-categorization
system that classifies every transaction by type (Food, Rent, EMI, etc.)
and extracts the merchant name.

────────────────────────────────────────────────
BACKEND — analytics/categorizer.py:
────────────────────────────────────────────────
Create a Categorizer class:

1. Load categories and their keywords from MySQL categories table on init.

2. categorize(description: str) → str
   - Lowercase the description
   - For each category, check if any keyword (from its JSON array) appears in description
   - Return the first matching category name
   - Return "Uncategorized" if no match

3. extract_merchant(description: str) → str
   - Clean the description: remove UPI IDs, transaction ref numbers, bank codes
   - Common patterns to strip: "UPI-", "IMPS-", "NEFT-", "VPA ", trailing slashes,
     numeric-only tokens, "Dr" / "Cr" suffixes
   - Return the cleaned, title-cased merchant name (max 40 chars)

4. After upload (call from statements router), run categorize() and
   extract_merchant() on every transaction's description and UPDATE
   the transactions table.

────────────────────────────────────────────────
BACKEND — routers/transactions.py:
────────────────────────────────────────────────

GET /api/v1/transactions
Query params (all optional):
  - statement_id (int)
  - category (str)
  - type: "debit" | "credit"
  - search (str) — full-text LIKE on description
  - date_from, date_to (YYYY-MM-DD)
  - min_amount, max_amount (float)
  - page (int, default 1), page_size (int, default 50)

Response:
  {
    total: int,
    page: int,
    page_size: int,
    data: [ { id, txn_date, description, debit, credit, balance, category, merchant } ]
  }

────────────────────────────────────────────────
FRONTEND — TransactionTable.jsx + Transactions.jsx:
────────────────────────────────────────────────

TransactionTable.jsx:
- Columns: Date | Merchant | Description | Category | Debit | Credit | Balance
- Category shown as a colored badge chip (use category color from DB)
- Debit amounts in red, credit amounts in green
- Sort by any column (client-side for current page)
- Pagination controls at bottom (prev/next + page number display)

Transactions.jsx page:
- Top filter bar with:
  · Statement selector dropdown (from getStatements())
  · Search input (debounced 400ms)
  · Category filter dropdown
  · Type toggle: All | Debit | Credit
  · Date range pickers (from/to)
  · Min/Max amount inputs
  · "Clear Filters" button
- Render TransactionTable below the filter bar
- Show summary row at top: total transactions, total debit, total credit

DELIVERABLE: After uploading a statement, navigate to /transactions,
select it, and see all transactions with correct categories, merchant names,
color-coded amounts, and working filters.
```

---

## ═══ PHASE 4 — Analytics API & Dashboard Charts ═══

```
PHASE 4 GOAL: Build all analytics endpoints and wire them to the
Dashboard page with interactive Recharts visualizations.

────────────────────────────────────────────────
BACKEND — routers/insights.py (analytics routes):
────────────────────────────────────────────────

GET /api/v1/analytics/summary/{stmt_id}
Response:
  {
    total_income: float,       ← sum of credit column
    total_expense: float,      ← sum of debit column
    savings: float,            ← total_income - total_expense
    savings_rate: float,       ← savings / total_income * 100
    top_category: str,         ← category with highest total debit
    daily_avg_spend: float,    ← total_expense / days in month
    transaction_count: int,
    opening_balance: float,    ← balance of first transaction
    closing_balance: float     ← balance of last transaction
  }

GET /api/v1/analytics/categories/{stmt_id}
Response: Array of {
  category: str,
  total: float,
  count: int,
  percentage: float,    ← total / sum_of_all_debits * 100
  color: str,           ← hex from categories table
  icon: str
}
Ordered by total descending.

GET /api/v1/analytics/trend
Query param: bank_name (optional, filter by bank)
Response: Array of {
  month: int, year: int, label: str (e.g. "Jan 2024"),
  total_income: float, total_expense: float, savings: float
}
Ordered by year asc, month asc. Returns data for all uploaded statements.

GET /api/v1/analytics/compare?ids=1,2
Response: {
  statements: [stmt1_detail, stmt2_detail],
  summary: [summary1, summary2],
  categories: [categories1, categories2]
}

────────────────────────────────────────────────
FRONTEND — Dashboard.jsx:
────────────────────────────────────────────────

Layout: Full-width page with:

1. TOP ROW — MonthPicker.jsx:
   Dropdown/tabs listing all uploaded statements (bank + month/year).
   Selecting one updates all charts and summary cards below.

2. SUMMARY CARDS ROW (4 cards):
   · Total Income (green, ↑ icon)
   · Total Expense (red, ↓ icon)
   · Savings (blue, 💰 icon) + Savings Rate %
   · Top Category (with emoji icon)

3. MAIN CHARTS ROW (2 columns):
   LEFT — IncomeExpenseBar.jsx:
     Recharts BarChart, grouped bars: Income (green) vs Expense (red) per month.
     Data from getTrend(). X-axis: month labels. Tooltip with exact values.

   RIGHT — CategoryPie.jsx:
     Recharts PieChart with custom label (category name + percentage).
     Each slice color from category color field.
     Data from getCategories(selectedStatementId).
     Clicking a slice filters the transaction table (optional bonus).

4. BOTTOM CHARTS ROW (2 columns):
   LEFT — BalanceLine.jsx:
     Recharts LineChart showing day-by-day closing balance within the selected month.
     Gradient fill (green above zero, red below).
     Data: query transactions for the statement, group by date, take last balance of day.

   RIGHT — SpendHeatmap.jsx:
     Bar chart or custom grid showing spending by day-of-week.
     X-axis: Mon–Sun. Y-axis: average spend. Highlight the peak day.

5. TOP MERCHANTS SECTION:
   Horizontal bar list of top 5 merchants with spend amount and a mini bar.

All charts must:
- Have loading skeleton states while fetching
- Have empty states with helpful messages
- Be responsive (stack to single column on mobile)

DELIVERABLE: Dashboard renders all 4 charts + summary cards for any selected
statement. Charts are interactive with tooltips.
```

---

## ═══ PHASE 5 — AI Insight Generation Engine ═══

```
PHASE 5 GOAL: Build the InsightsEngine that auto-generates actionable
insights and stores them in the DB, plus the Insights page to display them.

────────────────────────────────────────────────
BACKEND — analytics/insights_engine.py:
────────────────────────────────────────────────

Create InsightsEngine class. Constructor takes a pandas DataFrame of transactions
and the statement_id. Implement these methods, each returning a list of insight dicts
{type, title, body, severity}:

1. detect_anomalies() → list
   - Compute mean and std of debit column
   - Flag transactions where debit > mean + 2.5 * std as anomalies
   - For each: severity="alert", type="anomaly"
   - Title: "Unusual Transaction Detected"
   - Body: "₹{amount} paid to {merchant} on {date} is significantly higher than your average spend."

2. top_merchants(n=5) → list
   - Group by merchant, sum debits, return top n
   - severity="info", type="pattern"
   - Title: "Top Merchant: {merchant}"
   - Body: "You spent ₹{total} across {count} transactions at {merchant} this month."

3. savings_rate_insight() → list
   - Compute (credit_sum - debit_sum) / credit_sum * 100
   - If rate > 20%: severity="info", "Great savings rate of {rate:.1f}%!"
   - If rate 10–20%: severity="info", moderate message
   - If rate < 10%: severity="warn", "Your savings rate is low at {rate:.1f}%. Consider reducing discretionary spending."

4. category_budget_warning() → list
   - For each category where total_debit > 30% of overall total_debit:
   - severity="warn", type="tip"
   - Title: "{category} is {pct:.0f}% of your budget"
   - Body: "Consider setting a monthly limit for {category} spending."

5. peak_spend_day() → list
   - Group transactions by day of week, find highest average spend day
   - severity="info", type="pattern"
   - Body: "You spend the most on {weekday}s, averaging ₹{avg:.0f} per day."

6. generate_all() → list[dict]
   - Call all 5 methods above, combine results, return full list

────────────────────────────────────────────────
BACKEND — POST /api/v1/insights/generate/{stmt_id}:
────────────────────────────────────────────────
- Load all transactions for stmt_id from DB into a DataFrame
- Instantiate InsightsEngine and call generate_all()
- Delete existing insights for this statement_id (re-generate fresh)
- INSERT all new insights into insights table
- Return: { generated: int (count of insights created) }

GET /api/v1/insights/{stmt_id}
- Return all insights for this statement ordered by severity (alert first, then warn, then info)
- Response: [ { id, type, title, body, severity, created_at } ]

────────────────────────────────────────────────
FRONTEND — InsightCard.jsx + Insights.jsx:
────────────────────────────────────────────────

InsightCard.jsx:
- Props: { type, title, body, severity }
- severity styling:
  · "alert" → red left border, red icon (⚠️), red title
  · "warn"  → amber left border, amber icon (💡), amber title
  · "info"  → blue left border, blue icon (ℹ️), blue/white title
- Animated entrance (fade + slide up on mount)
- Show type badge (Anomaly / Pattern / Tip)

Insights.jsx page:
- Statement selector at top
- "Generate Insights" button → calls generateInsights(id) then reloads
- Render InsightCards in a responsive grid (3 cols desktop, 1 col mobile)
- Group by severity: Alerts section first, Warnings, then Info
- Show count badges per section (e.g., "3 Alerts")
- Empty state: "No insights yet. Upload a statement and click Generate."

DELIVERABLE: Navigate to /insights, select a statement, click Generate,
and see categorized insight cards with correct severity colors.
```

---

## ═══ PHASE 6 — Compare View & Recurring Payments ═══

```
PHASE 6 GOAL: Build the month-over-month comparison page and the recurring
payment detector that identifies subscriptions and EMIs across statements.

────────────────────────────────────────────────
BACKEND — analytics/trend_analyzer.py:
────────────────────────────────────────────────

detect_recurring(statement_ids: list[int]) → list[dict]
  - Load transactions for all given statement_ids
  - Group by (merchant, approximate_amount) where approximate_amount means
    within ±5% of each other across months
  - Flag merchant+amount combos that appear in 2+ different months as recurring
  - Return: [ { merchant, amount, months: ["Jan 2024", "Feb 2024"], type: "subscription"|"emi" } ]
  - Classify as "subscription" if amount < ₹2000, else "emi"

Add to POST /api/v1/insights/generate/{stmt_id}:
  - Also detect recurring payments across ALL statements for this bank_name
  - Add them as insights of type="pattern", severity="info"
  - Title: "Recurring Payment: {merchant}"
  - Body: "₹{amount} detected every month for {n} months. Likely a {type}."

────────────────────────────────────────────────
BACKEND — GET /api/v1/analytics/compare?ids=1,2:
────────────────────────────────────────────────
(Implement fully if not done in Phase 4)
Response:
{
  statements: [
    { id, bank_name, month, year, total_credit, total_debit },
    { id, bank_name, month, year, total_credit, total_debit }
  ],
  category_comparison: [
    { category, amount_a: float, amount_b: float, change_pct: float }
  ],
  summary_comparison: {
    income:   [float, float],
    expense:  [float, float],
    savings:  [float, float],
    savings_rate: [float, float]
  }
}

────────────────────────────────────────────────
FRONTEND — Compare.jsx:
────────────────────────────────────────────────

Layout: Two-column comparison page.

1. HEADER: Two statement selectors (Statement A | vs | Statement B)
   Each is a dropdown of all uploaded statements. Disable selecting the same one twice.

2. SUMMARY COMPARISON TABLE:
   | Metric       | Statement A  | Statement B  | Change    |
   | Total Income | ₹X           | ₹Y           | +12% ↑   |
   | Total Expense| ₹X           | ₹Y           | -5%  ↓   |
   | Savings      | ₹X           | ₹Y           | ...       |
   | Savings Rate | X%           | Y%           | ...       |
   Color-code Change column: green for improvement, red for worse.

3. CATEGORY COMPARISON CHART:
   Recharts grouped BarChart with categories on X-axis,
   two bars per group (Statement A in blue, Statement B in orange).
   Show change % as a small label above each bar pair.

4. RECURRING PAYMENTS SECTION:
   List of detected recurring payments across both statements.
   Each item shows: merchant name, amount, months found, type badge (subscription/EMI).

DELIVERABLE: Select two statements and see a full side-by-side
comparison with the summary table, grouped bar chart, and recurring payments list.
```

---

## ═══ PHASE 7 — Polish, UX & Final Touches ═══

```
PHASE 7 GOAL: Production-ready polish — loading states, error handling,
responsive design, empty states, and a great overall UX.

────────────────────────────────────────────────
GLOBAL UX:
────────────────────────────────────────────────

1. Navbar.jsx:
   - Logo + app name on left
   - Navigation links: Dashboard | Upload | Transactions | Insights | Compare
   - Active link highlight
   - Responsive: hamburger menu on mobile

2. Loading States:
   - All data-fetching components must show a skeleton loader (pulsing gray boxes)
     while the API call is in progress
   - Use a custom useAsync hook to manage loading/error/data states

3. Error Handling:
   - If any API call fails, show an inline error banner with the error message
     and a "Retry" button
   - 404 page for unknown routes

4. Toast Notifications:
   - Upload success/failure
   - Insight generation complete
   - Statement deletion
   - Use a simple custom toast component (no external library needed)

5. Empty States:
   - Dashboard with no statements: "Upload your first bank statement to get started →" button
   - Transactions with no data: illustrated empty state with message
   - Insights with no insights: prompt to generate

────────────────────────────────────────────────
RESPONSIVE DESIGN:
────────────────────────────────────────────────
- All pages must work on mobile (375px+), tablet (768px+), and desktop (1280px+)
- Dashboard charts: 2-col grid on desktop, 1-col on mobile
- TransactionTable: horizontal scroll on mobile
- Navbar: hamburger on mobile

────────────────────────────────────────────────
PERFORMANCE:
────────────────────────────────────────────────
- Debounce the transaction search input (400ms)
- Memoize chart data with useMemo
- Lazy-load page components with React.lazy + Suspense

────────────────────────────────────────────────
OPTIONAL BONUS (if time permits):
────────────────────────────────────────────────
- Dark/Light theme toggle (CSS variables based)
- Export transactions as CSV (frontend: convert JSON to CSV and trigger download)
- Export Insights as PDF (backend: use ReportLab to generate a PDF summary report)
  Endpoint: GET /api/v1/statements/{id}/export-pdf
- OpenAI integration: replace rule-based insight bodies with GPT-generated
  natural language explanations (POST /api/v1/insights/generate/{stmt_id} with
  use_ai=true query param)

────────────────────────────────────────────────
FINAL CHECKLIST:
────────────────────────────────────────────────
□ All 11 API endpoints functional and returning correct data
□ PDF upload works for SBI and HDFC (at minimum)
□ All transactions auto-categorized on upload
□ Dashboard shows all 4 charts populated with real data
□ Insights generate and display with correct severity colors
□ Compare page works with any two uploaded statements
□ No hardcoded values — all config in .env files
□ CORS properly configured
□ No console errors on frontend
□ README.md written with setup instructions

DELIVERABLE: A fully working full-stack application ready for
B.Tech capstone presentation and demonstration.
```

---

## QUICK REFERENCE — All API Endpoints

| Method | Endpoint | Phase |
|--------|----------|-------|
| POST | /api/v1/statements/upload | 2 |
| GET | /api/v1/statements | 2 |
| GET | /api/v1/statements/{id} | 2 |
| DELETE | /api/v1/statements/{id} | 2 |
| GET | /api/v1/transactions | 3 |
| GET | /api/v1/analytics/summary/{stmt_id} | 4 |
| GET | /api/v1/analytics/categories/{stmt_id} | 4 |
| GET | /api/v1/analytics/trend | 4 |
| GET | /api/v1/analytics/compare?ids=1,2 | 6 |
| GET | /api/v1/insights/{stmt_id} | 5 |
| POST | /api/v1/insights/generate/{stmt_id} | 5 |

---

*Bank Statement Analyzer · B.Tech CS · AI & Data Science · Capstone Project*
*React 18 + Vite 5 · Python FastAPI · MySQL 8 · Generated April 2026*
