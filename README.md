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
