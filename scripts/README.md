# Synthetic manufacturing data

The seed generator creates fictional JSPL-style orders, production, quality, NCR/CAPA,
reinspection, and dispatch data. It uses a fixed Faker seed and deterministic UUIDs, so
regenerating the SQL produces the same dataset.

## Generate

Install Faker:

```bash
python3 -m pip install Faker
python3 scripts/generate_dummy_data.py
```

To write to another PostgreSQL-compatible file:

```bash
python3 scripts/generate_dummy_data.py --output /tmp/jspl_seed.sql
```

## Import into Supabase

Apply the schema migration first. Then run either:

1. Supabase Dashboard → **SQL Editor** → paste `supabase/seed.sql` → Run.
2. Supabase CLI:

```bash
npx supabase db reset
npx supabase db execute --file supabase/seed.sql
```

The seed is transaction-wrapped and removes only the synthetic seed tables and
`@jspl-synthetic.invalid` auth users before inserting records. Existing real customer,
project, and operational data should not be stored in the same database when running the
seed because it clears seeded manufacturing tables for repeatable loading.

## Counts

| Table | Count |
|---|---:|
| customers | 20 |
| profiles | 30 |
| suppliers | 15 |
| orders | 50 |
| projects | 50 |
| engineering drawings | 100 |
| BOM items | 300 |
| materials | 100 |
| purchase orders | 60 |
| purchase order items | 120 |
| material receipts | 100 |
| incoming inspections | 100 |
| production jobs | 50 |
| production stages | 150 |
| quality inspections | 200 |
| NCRs | 30 |
| corrective actions | 30 |
| reinspection records | 30 |
| final inspections | 50 |
| dispatches | 30 |

The seed includes failed and pending inspections, NCR/CAPA records, rework/reinspection,
MTO and ETO orders, completed/in-progress/cancelled jobs, and dispatched/delivered records.
