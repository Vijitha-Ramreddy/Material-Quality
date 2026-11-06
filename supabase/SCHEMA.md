# JSPL Manufacturing and Quality Inspection Database

## Workflow coverage

The schema covers the nine-stage manufacturing workflow:

1. Customer order: `customers`, `orders`, `workflow_history`.
2. Engineering review: `engineering_drawings`, `drawing_revisions`.
3. Project planning: `projects`, `bom_items`.
4. Procurement: `suppliers`, `purchase_orders`, `purchase_order_items`, `quality_plans`.
5. Material receipt: `materials`, `material_receipts`.
6. Incoming inspection: `incoming_inspections`, `non_conformance_reports`.
7. Production: `production_jobs`, `production_stages`.
8. In-process quality: `quality_inspections`, `corrective_actions`, `reinspection_records`.
9. Final inspection and dispatch: `final_inspections`, `dispatches`.

`quality_documents` stores Supabase Storage references, while `workflow_history` retains every stage transition and `audit_logs` records record changes.

## Relationship explanation

- One customer can own many orders.
- One order can have many engineering drawings and one planned project.
- A drawing belongs to many revisions; its current revision is referenced by the drawing itself.
- A project owns BOM items and quality plans. BOM items can be nested through `parent_bom_item_id`.
- A supplier fulfills purchase orders containing ordered items.
- Purchase order items receive many material receipts. Receipt material identity is optional until the material master is matched.
- A receipt has one incoming inspection. Failed incoming material can produce one or more NCRs.
- A project has production jobs. Jobs contain ordered production stages.
- Quality plans can govern jobs and inspections. Inspection failures can generate NCRs.
- NCRs can have many corrective actions and reinspection records.
- A production job has one final inspection, which has at most one dispatch.
- Generic workflow history and audit records support entity references without creating circular foreign keys.

## ER diagram

```mermaid
erDiagram
  profiles ||--o{ orders : creates
  customers ||--o{ orders : places
  orders ||--o{ engineering_drawings : references
  engineering_drawings ||--o{ drawing_revisions : has
  engineering_drawings o|--|| drawing_revisions : current_revision
  orders ||--o| projects : plans
  projects ||--o{ bom_items : contains
  bom_items o|--o{ bom_items : parent
  projects ||--o{ quality_plans : defines
  bom_items o|--o{ quality_plans : applies_to
  suppliers ||--o{ purchase_orders : fulfills
  projects o|--o{ purchase_orders : receives
  purchase_orders ||--o{ purchase_order_items : contains
  purchase_order_items o|--o{ bom_items : references
  purchase_order_items ||--o{ material_receipts : received_as
  suppliers ||--o{ material_receipts : supplies
  materials o|--o{ material_receipts : identifies
  material_receipts ||--o| incoming_inspections : inspected_by
  projects ||--o{ production_jobs : executes
  production_jobs ||--o{ production_stages : contains
  production_jobs ||--o{ quality_inspections : inspected_during
  production_stages o|--o{ quality_inspections : inspected_at
  quality_plans o|--o{ quality_inspections : governs
  incoming_inspections o|--o{ non_conformance_reports : creates
  quality_inspections o|--o{ non_conformance_reports : creates
  production_jobs o|--o{ non_conformance_reports : creates
  non_conformance_reports ||--o{ corrective_actions : requires
  non_conformance_reports ||--o{ reinspection_records : reinspected_by
  corrective_actions o|--o{ reinspection_records : verifies
  production_jobs ||--o| final_inspections : results_in
  final_inspections ||--o| dispatches : authorizes
  orders ||--o{ dispatches : ships
  projects o|--o{ quality_documents : owns
  quality_documents o|--o{ quality_inspections : supports
  profiles o|--o{ workflow_history : performs
  profiles o|--o{ audit_logs : changes
```
