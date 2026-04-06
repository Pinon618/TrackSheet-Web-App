# Product Requirements Document
## Order Transaction Tracker
**Web Application — React + Node.js + MongoDB**

| Field | Value |
|---|---|
| Version | 1.0.0 |
| Status | Draft |
| Date | April 2025 |
| Author | DoppleBytes |
| Stack | React / Node.js / MongoDB / Firebase Auth |

---

## 1. Product Overview

The Order Transaction Tracker is a full-stack web application that digitizes and replaces the current Excel-based order tracking workflow used across multiple supplier relationships. The platform enables an Admin to manage supplier invoices, pack-size-based order quantities, partial payments, shipping charges, and outstanding balances — all in one centralized, real-time dashboard.

### Problem Statement

- Managing multi-supplier orders across pack sizes (1/2/3/4/6-pack) in Excel is error-prone and time-consuming.
- Tracking partial payments, outstanding dues, and carry-forward balances requires manual calculation.
- No audit trail exists for payment history across invoices.
- No centralized view of total due vs. total paid across all suppliers.

### Goals

1. Provide a secure, Admin-only web interface to track all orders and payments.
2. Auto-calculate units, totals, shipping, dues from pack-size inputs.
3. Maintain a full payment log with invoice serial tracking.
4. Provide a real-time summary dashboard with financial overview.
5. Support data export to Excel for reporting.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite + TypeScript | UI, routing, state management |
| Styling | Tailwind CSS | Utility-first responsive styling |
| Backend | Node.js + Express | REST API, business logic |
| Database | MongoDB + Mongoose | Orders, payments, users |
| Auth | Firebase Authentication | Admin sign-in, session management |
| Validation | Zod | Schema validation on client & server |
| Export | ExcelJS | Excel export functionality |
| Hosting | Vercel (FE) + Render (BE) | Deployment |

---

## 3. User Roles

| Role | Access | Notes |
|---|---|---|
| **Admin** | Full access — create, read, update, delete orders and payments | Single admin account via Firebase Auth |
| **Viewer** | Read-only access — dashboard, analytics, orders, payment log | Separate Firebase account, role stored in MongoDB |

---

## 4. Core Data Models

### Order Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| invoiceSerial | String | Unique invoice serial number (e.g. OZI78967) |
| orderDate | Date | Date of order placement |
| supplier | String | Supplier/manufacturer name |
| packs.p1 / p2 / p3 / p4 / p6 | Number | Number of boxes per pack size |
| unitPrice | Number | Price per single unit (auto-multiplied) |
| shippingCost | Number | Separate shipping charge for this order |
| previousDue | Number | Carried-forward due from previous invoice |
| productTotal | Number (calc) | Sum of (boxes × units × unitPrice) per pack |
| grandTotal | Number (calc) | productTotal + shippingCost + previousDue |
| totalPaid | Number | Sum of all payments made on this order |
| balanceDue | Number (calc) | grandTotal - totalPaid |
| status | Enum | PAID \| PARTIAL \| DUE — auto-derived |
| notes | String | Optional remarks |

### Payment Document (MongoDB)

| Field | Type | Description |
|---|---|---|
| invoiceSerial | String | Reference to parent order |
| supplier | String | Supplier name (denormalized for quick lookup) |
| paymentDate | Date | Date payment was made |
| amount | Number | Amount paid in this transaction |
| paymentType | Enum | Bank Transfer \| Cash \| Mobile Banking \| Other |
| referenceNo | String | Transaction reference number |
| notes | String | Optional remarks |

---

## 5. Epics & User Stories

---

## EPIC 1: Authentication & Admin Access
> Secure admin-only access using Firebase Authentication with session management.

---

### US-1.1 — Admin Sign In
**As an Admin**, I want to sign in with my email and password so that I can access the tracker securely.

**Acceptance Criteria:**
- Sign-in page shown at root route for unauthenticated users.
- Firebase email/password authentication is used.
- On success, Admin is redirected to the dashboard.
- On failure, a clear error message is shown.
- Session persists across browser refresh.

---

### US-1.2 — Admin Sign Out
**As an Admin**, I want to sign out so that my session is securely ended on shared devices.

**Acceptance Criteria:**
- Sign out button visible in the top navigation bar.
- On sign out, Firebase session is cleared.
- User is redirected to the sign-in page.
- Protected routes are inaccessible after sign-out.

---

### US-1.3 — Protected Route Guard
**As the system**, I want all dashboard routes to be protected so that unauthenticated users cannot access order data.

**Acceptance Criteria:**
- All routes except /login redirect to /login if not authenticated.
- Auth state is checked via Firebase onAuthStateChanged.
- Loading spinner shown while auth state is being resolved.
- No flash of protected content before redirect.

---

### US-1.4 — Persistent Login Session
**As an Admin**, I want my login to persist across browser sessions so that I do not have to sign in repeatedly.

**Acceptance Criteria:**
- Firebase LOCAL persistence is configured.
- Auth state is restored on app load without re-login.
- Session can be manually cleared via sign-out.

---

## EPIC 2: Order Management
> Full CRUD operations for orders with Ozipco-style pack-size breakdown, auto-calculations, and invoice tracking.

---

### US-2.1 — Create New Order
**As an Admin**, I want to create a new order by entering invoice serial, supplier, pack quantities, unit price, shipping, and previous due so that it is saved to the database.

**Acceptance Criteria:**
- Form includes: Invoice Serial No, Order Date, Supplier, 1/2/3/4/6-pack box quantities.
- Unit Price, Shipping Cost, Previous Due fields are present.
- Total Units, Product Total, Grand Total are auto-calculated and shown live.
- Form validates all required fields using Zod before submission.
- On success, the new order appears in the orders list immediately.
- Duplicate invoice serial numbers are rejected with an error.

---

### US-2.2 — View Orders List
**As an Admin**, I want to see all orders in a table matching the Excel layout so that I can track the full order history.

**Acceptance Criteria:**
- Table columns: Invoice Serial, Date, Supplier, Total Boxes, per-pack breakdown (Boxes/Units/Total Qty), Unit Price, Product Total, Shipping, Prev Due, Grand Total, Paid, Balance Due, Status, Notes.
- Rows are sorted by order date descending by default.
- Status badge shows PAID (green), PARTIAL (amber), or DUE (red).
- Pagination or infinite scroll for large datasets.
- Table is horizontally scrollable on smaller screens.

---

### US-2.3 — Edit Existing Order
**As an Admin**, I want to edit any order so that I can correct mistakes or update payment information.

**Acceptance Criteria:**
- Edit button opens a pre-filled form modal with existing order data.
- All fields are editable except Invoice Serial No (read-only after creation).
- Calculations update live as fields are changed.
- On save, the order record in MongoDB is updated.
- Updated status (PAID/PARTIAL/DUE) is recalculated on save.

---

### US-2.4 — Delete Order
**As an Admin**, I want to delete an order so that test or incorrect entries can be removed.

**Acceptance Criteria:**
- Delete button triggers a confirmation dialog before proceeding.
- On confirm, order is soft-deleted (isDeleted: true) in MongoDB.
- Associated payment records are also marked as deleted.
- Deleted orders do not appear in any list or summary.

---

### US-2.5 — Search and Filter Orders
**As an Admin**, I want to search and filter orders so that I can quickly find specific invoices or suppliers.

**Acceptance Criteria:**
- Search by Invoice Serial No (real-time text filter).
- Filter by Supplier (dropdown of all suppliers).
- Filter by Status: All / PAID / PARTIAL / DUE.
- Filter by Date Range (from/to date picker).
- All filters can be combined and reset with a single button.

---

### US-2.6 — Auto-Calculate Order Totals
**As an Admin**, I want all totals to be calculated automatically as I type so that I do not make manual calculation errors.

**Acceptance Criteria:**
- Total Units = sum of (boxes × pack_size) for all pack types.
- Product Total = Total Units × Unit Price.
- Grand Total = Product Total + Shipping + Previous Due.
- Balance Due = Grand Total - Total Paid.
- All calculations update in real-time on input change.
- Calculated fields are visually distinct (grey, read-only).

---

## EPIC 3: Payment Management
> Track partial payments, payment history, and balance carry-forward per invoice.

---

### US-3.1 — Log a Payment
**As an Admin**, I want to log a payment against an invoice so that the balance due is updated.

**Acceptance Criteria:**
- Payment form includes: Payment Date, Amount, Payment Type, Reference No, Notes.
- Payment is linked to an invoice via Invoice Serial No.
- On save, totalPaid on the parent order is recalculated.
- Balance Due and Status on the order update automatically.
- Overpayment is allowed (balance shows as 0, not negative).

---

### US-3.2 — View Payment History Per Invoice
**As an Admin**, I want to see all payments made against a specific invoice so that I have a full audit trail.

**Acceptance Criteria:**
- Clicking an order row expands or navigates to a payment history view.
- Payment log shows: Date, Amount, Type, Reference No, Notes.
- Payments are sorted by date descending.
- Total paid and remaining due are shown as a summary.

---

### US-3.3 — Edit or Delete a Payment
**As an Admin**, I want to edit or delete a logged payment so that I can correct mistakes.

**Acceptance Criteria:**
- Edit opens a pre-filled payment form.
- Delete triggers a confirmation dialog.
- After edit or delete, parent order's totalPaid and status recalculate.

---

### US-3.4 — Carry Forward Previous Due
**As an Admin**, I want to enter a previous due amount when creating an order so that unpaid balances from past invoices are included in the new order's grand total.

**Acceptance Criteria:**
- Previous Due field is available on the order form.
- Previous Due is included in Grand Total calculation.
- Shown as a separate line item in order detail view.

---

## EPIC 4: Dashboard & Summary
> Real-time financial overview with key metrics and supplier-wise breakdown.

---

### US-4.1 — Summary Metrics Cards
**As an Admin**, I want to see key financial metrics on the dashboard so that I have an instant overview.

**Acceptance Criteria:**
- Cards show: Total Orders, Total Boxes, Total Units, Total Product Value, Total Shipping, Grand Total, Total Paid, Total Balance Due.
- Cards update in real time as orders are added or updated.
- Balance Due card is highlighted in red if non-zero.
- Total Paid card is highlighted in green.

---

### US-4.2 — Supplier-wise Breakdown
**As an Admin**, I want to see a per-supplier summary so that I know how much I owe each manufacturer.

**Acceptance Criteria:**
- Table shows each unique supplier with: Total Orders, Total Grand Total, Total Paid, Balance Due.
- Sorted by Balance Due descending.
- Click on a supplier name filters the main order table to that supplier.

---

### US-4.3 — Status Distribution Chart
**As an Admin**, I want a visual chart showing order status distribution so that I can see how many orders are paid vs due.

**Acceptance Criteria:**
- Pie or donut chart showing count of PAID / PARTIAL / DUE orders.
- Color coded: green for PAID, amber for PARTIAL, red for DUE.
- Chart updates when filters are applied.

---

### US-4.4 — Recent Orders Widget
**As an Admin**, I want to see the 5 most recent orders on the dashboard so that I can quickly access the latest activity.

**Acceptance Criteria:**
- Shows last 5 orders by date with: Invoice Serial, Supplier, Grand Total, Status.
- Click on an order navigates to order detail or opens edit modal.

---

## EPIC 5: Supplier Management
> Manage the list of suppliers to maintain consistency across orders.

---

### US-5.1 — Create Supplier
**As an Admin**, I want to add a new supplier so that I can select them when creating orders.

**Acceptance Criteria:**
- Form includes: Supplier Name, Contact Person, Phone, Country/Region, Notes.
- Supplier name must be unique.
- On success, supplier appears in all supplier dropdowns.

---

### US-5.2 — View All Suppliers
**As an Admin**, I want to see a list of all suppliers so that I can manage them.

**Acceptance Criteria:**
- Table shows: Name, Contact, Phone, Total Orders, Total Balance Due.
- Search by name.
- Click to view supplier order history.

---

### US-5.3 — Edit and Delete Supplier
**As an Admin**, I want to edit or delete a supplier so that I can keep the list accurate.

**Acceptance Criteria:**
- Edit opens pre-filled supplier form.
- Delete is blocked if supplier has existing orders (show warning).
- Soft delete if no orders exist.

---

## EPIC 6: Data Export
> Export order data to Excel for offline reporting and sharing.

---

### US-6.1 — Export Orders to Excel
**As an Admin**, I want to export the current orders view to an Excel file so that I can share it or use it offline.

**Acceptance Criteria:**
- Export button available in the orders list header.
- Exported file matches the column layout of the original Excel tracker.
- Currently filtered/searched data is exported (not all records).
- File name includes date: `orders_export_YYYY-MM-DD.xlsx`.
- ExcelJS is used server-side for generation.

---

### US-6.2 — Export Payment Log to Excel
**As an Admin**, I want to export the full payment log to Excel so that I have a financial record.

**Acceptance Criteria:**
- Separate export for payment history.
- Includes: Date, Invoice Serial, Supplier, Amount, Type, Reference.
- File name: `payments_export_YYYY-MM-DD.xlsx`.

---

## EPIC 7: UI/UX & Responsive Design
> Clean, professional, mobile-friendly interface that mirrors the Excel layout.

---

### US-7.1 — Responsive Dashboard Layout
**As an Admin**, I want the app to be usable on mobile and desktop so that I can check orders from my phone.

**Acceptance Criteria:**
- Dashboard is usable at 375px (mobile) and 1440px (desktop).
- Summary cards stack vertically on mobile.
- Orders table scrolls horizontally on small screens.
- Navigation collapses to a hamburger menu on mobile.

---

### US-7.2 — Dark / Light Mode
**As an Admin**, I want to toggle between dark and light mode so that I can use the app comfortably in different lighting.

**Acceptance Criteria:**
- Toggle button in the navbar switches between modes.
- Preference is saved to localStorage.
- All components respect the selected theme.

---

### US-7.3 — Loading States & Error Handling
**As an Admin**, I want to see loading indicators and error messages so that I know when the app is working or when something fails.

**Acceptance Criteria:**
- Skeleton loaders shown on table and cards during data fetch.
- Toast notifications for: order saved, payment logged, export ready, errors.
- Network error banner if API is unreachable.
- Form submission buttons show spinner while saving.

---

## EPIC 8: Data Visualization
> Visual analytics page accessible to both Admin and Viewer — summary KPI cards at the top, followed by interactive charts for payment, due, pack/box, and supplier data.

---

### US-8.1 — KPI Summary Cards (Visualization Page)
**As an Admin or Viewer**, I want to see key numbers at the top of the analytics page so that I can instantly understand my financial position without reading a table.

**Acceptance Criteria:**
- Cards displayed in a responsive grid (2 columns on mobile, 4 on desktop).
- The following KPI cards are shown:
  - **Total Payments Done** — sum of all payments made across all invoices.
  - **Total Due Right Now** — sum of all current balance dues across all orders.
  - **Total Boxes Ordered** — total box count across all pack sizes and all orders.
  - **Total Units Ordered** — total unit count (boxes × pack size) across all orders.
  - **Total Orders** — count of all orders.
  - **Total Suppliers** — count of unique suppliers.
- Each card shows a label, value, and a small trend icon (up/down vs previous month).
- Cards are read-only for Viewer role.
- Data refreshes automatically when new orders or payments are added.

---

### US-8.2 — Payment vs Due Bar Chart
**As an Admin or Viewer**, I want to see a bar chart comparing total payments made vs total due so that I can understand my overall payment health at a glance.

**Acceptance Criteria:**
- Grouped bar chart with two bars per supplier: Total Paid (green) and Balance Due (red).
- X-axis shows supplier names; Y-axis shows amount in ৳.
- Hovering a bar shows exact values in a tooltip.
- Chart is rendered using Recharts.
- A toggle allows switching between "Per Supplier" and "Per Month" view.
- Empty state shown if no data exists.

---

### US-8.3 — Order Status Pie / Donut Chart
**As an Admin or Viewer**, I want to see a pie or donut chart of order statuses so that I can see the proportion of PAID, PARTIAL, and DUE orders visually.

**Acceptance Criteria:**
- Donut chart with three segments: PAID (green), PARTIAL (amber), DUE (red).
- Center of the donut shows total order count.
- Legend below the chart shows segment label + count + percentage.
- Clicking a segment filters the orders table to that status.
- Chart is rendered using Recharts.

---

### US-8.4 — Pack Size Distribution Bar Chart
**As an Admin or Viewer**, I want to see a bar chart showing how many boxes I have ordered per pack size so that I can understand my ordering pattern.

**Acceptance Criteria:**
- Horizontal or vertical bar chart with 5 bars: 1-Pack, 2-Pack, 3-Pack, 4-Pack, 6-Pack.
- Each bar shows total boxes ordered for that pack size across all orders.
- A second data series shows total units per pack size (boxes × pack multiplier).
- Toggle between "Boxes" and "Units" view.
- Tooltips show exact values on hover.

---

### US-8.5 — Monthly Spending Trend Line Chart
**As an Admin or Viewer**, I want to see a line chart of my monthly spending over time so that I can spot trends in my ordering and payment habits.

**Acceptance Criteria:**
- Line chart with X-axis as month (e.g. Jan 2025, Feb 2025) and Y-axis as ৳ amount.
- Three lines plotted: Grand Total, Total Paid, Balance Due.
- Date range selector (Last 3 months / 6 months / 12 months / All time).
- Points on the line are clickable and show that month's order list.
- Chart is rendered using Recharts.

---

### US-8.6 — Supplier-wise Pie Chart
**As an Admin or Viewer**, I want to see a pie chart of total order value distributed across suppliers so that I know which supplier I spend the most with.

**Acceptance Criteria:**
- Pie chart where each slice represents one supplier's share of total grand total.
- Hovering a slice shows supplier name, total value, and percentage.
- Legend lists all suppliers with their color.
- Clicking a slice navigates to that supplier's filtered order list.

---

### US-8.7 — Viewer Role Access to Analytics
**As a Viewer**, I want to access the analytics and visualization page without being able to modify any data so that I can monitor the business without risk of accidental changes.

**Acceptance Criteria:**
- Viewer can sign in via Firebase with a separate read-only account.
- Viewer can access: Dashboard, Analytics/Visualization page, Orders list (read-only), Payment log (read-only).
- All add, edit, delete buttons are hidden for Viewer role.
- Viewer cannot access Supplier management or Export features.
- Role is stored in MongoDB user document and checked server-side on every API call.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard and order list load within 2 seconds for up to 10,000 orders. |
| Security | All API routes require a valid Firebase JWT token. Input sanitized to prevent NoSQL injection. |
| Scalability | MongoDB indexes on invoiceSerial, supplier, orderDate, status for fast queries. |
| Reliability | 99.5% uptime target. Errors logged server-side. No data loss on network failure. |
| Accessibility | WCAG 2.1 AA compliant. Keyboard navigable. Screen-reader friendly labels. |
| Browser | Supports Chrome, Firefox, Safari, Edge (latest 2 versions). iOS Safari and Android Chrome. |

---

## 7. Development Milestones

| Phase | Milestone | Epics Covered |
|---|---|---|
| Phase 1 | Foundation & Auth | Epic 1 — Auth, project setup, MongoDB connection, base layout |
| Phase 2 | Core Order CRUD | Epic 2 — Full order management with auto-calculations |
| Phase 3 | Payments | Epic 3 — Payment logging, history, carry-forward |
| Phase 4 | Dashboard | Epic 4 — Summary cards, charts, supplier breakdown |
| Phase 5 | Suppliers & Export | Epic 5 + 6 — Supplier management, Excel export |
| Phase 6 | Polish & Responsive | Epic 7 — Mobile UI, dark mode, loading states, error handling |
| Phase 7 | Data Visualization | Epic 8 — KPI cards, bar/pie/line charts, Viewer role access |

---

## 8. Out of Scope — v1.0

- Automated invoice generation or PDF export.
- Integration with accounting software (QuickBooks, Tally).
- Email/SMS notifications for due payments.
- Product/SKU-level inventory management.
