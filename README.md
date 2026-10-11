# Purchase Management

Diamond / Gold / Silver purchase entry with GST totals.

| Layer    | Tech                                  | Folder   |
|----------|---------------------------------------|----------|
| Frontend | React (Create React App)              | `src/`   |
| API      | ASP.NET Core 8 Web API + EF Core 8    | `api/`   |
| Database | PostgreSQL, database name `purchase`  | migrations in `api/Data/Migrations` |
| Tests    | xUnit (API), Jest (React)             | `tests/`, `src/**/*.test.js` |

## Setup

### 1. Database connection

The password is kept out of source control using .NET user-secrets:

```powershell
cd api
dotnet user-secrets set "ConnectionStrings:Purchase" "Host=localhost;Port=5432;Database=purchase;Username=postgres;Password=YOUR_PASSWORD"
```

### 2. Create the `purchase` database

```powershell
cd api
dotnet ef database update
```

This creates the `purchase` database (if missing) and the tables `purchase`, `purchase_diamond_item`,
`purchase_gold_item` and `purchase_silver_item`.
Requires the EF tool: `dotnet tool install -g dotnet-ef --version 8.0.11`.

### 3. Run

```powershell
# Terminal 1 – API on http://localhost:5023 (Swagger: /swagger)
cd api
dotnet run

# Terminal 2 – React on http://localhost:3000 (proxies /api to the API)
npm start
```

### Tests

```powershell
dotnet test Purchase.sln
npm test
```

## API

| Method | Route                          | Description                       |
|--------|--------------------------------|-----------------------------------|
| GET    | `/api/purchases?search=&type=` | List (search no./supplier/invoice) |
| GET    | `/api/purchases/next-number`   | Next auto Purchase No. (`PUR-00001`) |
| GET    | `/api/purchases/{id}`          | Purchase with line items          |
| POST   | `/api/purchases`               | Create                            |
| PUT    | `/api/purchases/{id}`          | Update (line items replaced)      |
| DELETE | `/api/purchases/{id}`          | Delete                            |

## Calculations

All amounts are recalculated on the server (`api/Services/PurchaseCalculator.cs`); the React form mirrors the
same logic (`src/utils/purchaseCalc.js`) for live display only.

- **Diamond:** Amount = Carat × Rate/Carat − Discount %
- **Gold:** Net = Gross − Stone · Wastage Wt = Net × Wastage % · Chargeable = Net + Wastage Wt ·
  Gold Value = Chargeable × Rate · Amount = Gold Value + Making + Other
- **Silver:** Net = Gross − Stone/Other · Silver Value = Net × Rate · Amount = Silver Value + Making + Other
- **Totals:** Gross = Σ item amounts · Taxable = Gross − Discount · CGST/SGST/IGST on Taxable ·
  Net Purchase Amount = Taxable + taxes rounded to the nearest rupee (difference shown as Round Off)

Amounts are rounded to 2 decimals, weights to 3 decimals.

## ERP screens (masters, purchase invoices, sales invoices)

Stored in the same `purchase` database. In Development the API applies pending migrations and fills empty
master lists on start-up (`api/Services/ErpSeeder.cs`), so `dotnet run` is enough.

| Area | Tables | API |
|------|--------|-----|
| Masters | `customer`, `supplier`, `item_category`, `item_collection`, `branch`, `metal_type`, `diamond_type`, `stone_type` | `GET /api/masters` (all lists) · `POST /api/masters/{kind}` (create / update by `id`) · `DELETE /api/masters/{kind}/{id}` |
| Purchase invoices | `purchase_invoice`, `purchase_invoice_item`, `purchase_item_stone`, `purchase_item_diamond` | `GET/POST /api/purchase-invoices` · `PUT/DELETE /api/purchase-invoices/{id}` · `DELETE …/{id}/items/{itemId}` · `POST …/skus/{sku}/rename` |
| Sales invoices | `sales_invoice`, `sales_invoice_line` | `GET/POST /api/sales-invoices` · `GET …/next-number` · `DELETE …/{id}` |

Rules enforced by the server:

- **SKU No.** = the item's Diamond Type prefix + a 5-digit running number per prefix (`AD-00001`); unique.
- **Cost / pc** = metal (net wt × rate) + diamonds + stones (per Ct: wt × rate, per Cert: pcs × rate)
  + max(net wt × labour/g, labour minimum) + hallmark + other (`ErpCalculator.cs`).
- **Stock** of a SKU = purchased qty − qty on sales invoices. A sale cannot exceed it; a sold item cannot be
  removed, renamed, or reduced below the sold qty.
- Master names are unique (case-insensitive); a name used by invoices cannot be renamed or deleted.

Data saved in the browser by earlier versions can be moved in once with the **Import to database** banner.
