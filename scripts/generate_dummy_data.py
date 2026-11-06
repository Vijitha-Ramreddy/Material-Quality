#!/usr/bin/env python3
"""Generate deterministic, Supabase-compatible JSPL dummy data."""

from __future__ import annotations

import argparse
import json
import random
import uuid
from datetime import date, timedelta
from pathlib import Path

from faker import Faker

SEED = 20261105
fake = Faker("en_IN")
fake.seed_instance(SEED)
random.seed(SEED)

NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Krishna", "Ishaan",
    "Diya", "Ananya", "Saanvi", "Myra", "Aadhya", "Navya", "Riya", "Meera",
]


def uid(label: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"jspl.synthetic.{label}"))


def sql_string(value: object | None) -> str:
    if value is None:
        return "null"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def sql_date(value: date) -> str:
    return sql_string(value.isoformat())


def sql_json(value: dict | list) -> str:
    return sql_string(json.dumps(value, separators=(",", ":"), ensure_ascii=True)) + "::jsonb"


def insert(table: str, columns: list[str], rows: list[tuple], output: list[str]) -> None:
    if not rows:
        return
    mismatches = [index for index, row in enumerate(rows, 1) if len(row) != len(columns)]
    if mismatches:
        raise ValueError(
            f"{table}: column count mismatch in rows {mismatches[:5]} "
            f"(expected {len(columns)}, got {[len(rows[i - 1]) for i in mismatches[:5]]})"
        )
    output.append(f"insert into public.{table} ({', '.join(columns)}) values")
    rendered = []
    for row in rows:
        rendered.append("  (" + ", ".join(row) + ")")
    output.append(",\n".join(rendered) + "\n  on conflict do nothing;")


def build_seed() -> str:
    out = [
        "-- GENERATED FILE: do not edit manually.",
        "-- Run scripts/generate_dummy_data.py to regenerate this deterministic seed.",
        "begin;",
    ]

    tables = [
        "welding_quality_requirements", "welder_qualification_records", "welding_procedure_qualifications", "welding_procedure_specifications",
        "steel_material_allocations", "manufacturing_traceability", "hydrostatic_tests", "ndt_records", "weld_records",
        "material_test_certificates",
        "audit_logs", "workflow_history", "dispatches", "quality_documents",
        "final_inspections", "reinspection_records", "corrective_actions",
        "non_conformance_reports", "quality_inspections", "production_stages",
        "production_jobs", "incoming_inspections", "material_receipts",
        "purchase_order_items", "purchase_orders", "quality_plans", "bom_items",
        "drawing_revisions", "engineering_drawings", "projects", "orders",
        "materials", "suppliers", "customers",
    ]
    for table in tables:
        out.append(f"delete from public.{table};")

    out.append("delete from auth.users where email like '%@jspl-synthetic.invalid';")

    profile_ids = [uid(f"profile-{i}") for i in range(1, 31)]
    roles = ["admin"] + ["sales_projects"] * 4 + ["engineering"] * 5 + ["stores"] * 3 + ["quality_assurance"] * 8 + ["production"] * 7 + ["logistics"] + ["planning_procurement"]
    out.append("insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values")
    auth_rows = []
    for i, profile_id in enumerate(profile_ids, 1):
        email = f"employee{i:02d}@jspl-synthetic.invalid"
        auth_rows.append(
            "  (" + ", ".join([
                sql_string(profile_id), "null", sql_string("authenticated"), sql_string("authenticated"),
                sql_string(email), "extensions.crypt('Demo@123', extensions.gen_salt('bf'))", sql_string("2025-01-01T00:00:00+00:00"),
                sql_string("2025-01-01T00:00:00+00:00"), sql_string("2025-01-01T00:00:00+00:00"),
            ]) + ")"
        )
    out.append(",\n".join(auth_rows) + " on conflict (id) do update set email = excluded.email;")

    profiles = []
    departments = {
        "admin": "Administration",
        "sales_projects": "Sales and Projects",
        "engineering": "Engineering",
        "planning_procurement": "Planning and Procurement",
        "stores": "Stores",
        "production": "Production",
        "quality_assurance": "Quality Assurance",
        "logistics": "Logistics",
    }
    for i, (profile_id, role) in enumerate(zip(profile_ids, roles), 1):
        name = fake.name()
        profiles.append((
            sql_string(profile_id), sql_string(f"EMP{i:04d}"), sql_string(name),
            sql_string(f"employee{i:02d}@jspl-synthetic.invalid"), sql_string(f"9{fake.random_int(min=100000000, max=999999999)}"),
            sql_string(role), sql_string(departments[role]), "true",
        ))
    insert("profiles", ["id", "employee_code", "full_name", "email", "phone", "role", "department", "active"], profiles, out)

    customer_ids = [uid(f"customer-{i}") for i in range(1, 21)]
    customers = []
    for i, customer_id in enumerate(customer_ids, 1):
        company = f"{fake.company()} Industries {i}"
        customers.append((
            sql_string(customer_id), sql_string(f"CUST{i:03d}"), sql_string(company),
            sql_string(f"purchase{i:02d}@{fake.domain_name()}"), sql_string(fake.phone_number()[:30]),
            sql_string(fake.name()), sql_string(fake.address().replace("\n", ", ")),
            sql_string(fake.address().replace("\n", ", ")), sql_string(f"22AAAA{i:04d}A1Z1"),
            "true",
        ))
    insert("customers", ["id", "code", "name", "email", "phone", "contact_person", "billing_address", "shipping_address", "gst_number", "active"], customers, out)

    order_ids = [uid(f"order-{i}") for i in range(1, 51)]
    project_ids = [uid(f"project-{i}") for i in range(1, 51)]
    orders = []
    projects = []
    statuses = ["draft", "confirmed", "in_progress", "completed", "cancelled", "on_hold"]
    job_statuses = ["planned", "released", "in_progress", "paused", "completed", "cancelled"]
    base = date(2024, 1, 1)
    for i, (order_id, project_id) in enumerate(zip(order_ids, project_ids), 1):
        customer_id = customer_ids[(i - 1) % 20]
        ordered_on = base + timedelta(days=(i * 11) % 650)
        delivery = ordered_on + timedelta(days=90 + i % 80)
        kind = "ETO - Engineer to Order" if i <= 25 else "MTO - Make to Order"
        status = statuses[(i - 1) % len(statuses)]
        orders.append((
            sql_string(order_id), sql_string(f"JSPL-ORD-{i:04d}"), sql_string(customer_id),
            sql_string(f"PO-{2024 + i // 300}-{i:05d}"), sql_string(f"{kind}: fabricated industrial assembly {i}"),
            sql_date(ordered_on), sql_date(delivery), sql_string(status), str(1 + i % 5),
            sql_string("INR"), str(250000 + i * 17500), sql_string(profile_ids[(i - 1) % 30]),
        ))
        project_status = "completed" if status == "completed" else job_statuses[(i - 1) % len(job_statuses)]
        actual_end = sql_date(delivery) if project_status == "completed" else "null"
        projects.append((
            sql_string(project_id), sql_string(f"PRJ-{i:04d}"), sql_string(order_id),
            sql_string(f"{kind} manufacturing project {i}"), sql_date(ordered_on + timedelta(days=5)),
            sql_date(delivery), actual_end, sql_string(project_status), sql_string(profile_ids[(i + 4) % 30]),
        ))
    insert("orders", ["id", "order_number", "customer_id", "customer_po_number", "description", "order_date", "required_delivery_date", "status", "priority", "currency", "total_value", "created_by"], orders, out)
    insert("projects", ["id", "project_code", "order_id", "name", "start_date", "planned_end_date", "actual_end_date", "status", "project_manager_id"], projects, out)

    drawing_ids = [uid(f"drawing-{i}") for i in range(1, 101)]
    drawings = []
    revisions = []
    revision_ids = []
    engineer = next(i for i, role in enumerate(roles) if role == "engineering")
    for i, drawing_id in enumerate(drawing_ids, 1):
        order_id = order_ids[(i - 1) % 50]
        revisions.append(None)
        drawings.append((
            sql_string(drawing_id), sql_string(f"DWG-RPR-{i:04d}"), sql_string(order_id),
            sql_string(f"Fabrication drawing assembly {i}"), sql_string("Mechanical"), sql_string("Synthetic fabrication drawing reference"),
            "null", sql_string(profile_ids[engineer]),
        ))
    insert("engineering_drawings", ["id", "drawing_number", "order_id", "title", "discipline", "description", "current_revision_id", "created_by"], drawings, out)
    for i, drawing_id in enumerate(drawing_ids, 1):
        rev_id = uid(f"drawing-revision-{i}")
        revision_ids.append(rev_id)
        status = "approved" if i % 5 else "under_review"
        approved_at = sql_string("2025-06-15T10:00:00+00:00") if status == "approved" else "null"
        approved_by = sql_string(profile_ids[engineer]) if status == "approved" else "null"
        revisions[i - 1] = rev_id
        revisions_row = (
            sql_string(rev_id), sql_string(drawing_id), sql_string("R0" if i % 2 else "A"),
            str(1 + i % 3), sql_string(status), sql_string("quality-documents"),
            sql_string(f"drawings/{drawing_id}/revision.pdf"), sql_string(f"DWG-RPR-{i:04d}.pdf"),
            str(250000 + i * 1000), sql_string("Approved fabrication revision" if status == "approved" else "Synthetic revision under review"),
            approved_by, approved_at, sql_string(profile_ids[engineer]),
        )
        insert("drawing_revisions", ["id", "drawing_id", "revision_code", "revision_number", "status", "storage_bucket", "storage_object_path", "file_name", "file_size", "change_summary", "approved_by", "approved_at", "created_by"], [revisions_row], out)
    out.append("update public.engineering_drawings d set current_revision_id = r.id from public.drawing_revisions r where r.drawing_id = d.id;")

    bom_ids = [uid(f"bom-{i}") for i in range(1, 301)]
    bom_rows = []
    for i, bom_id in enumerate(bom_ids, 1):
        project_id = project_ids[(i - 1) % 50]
        parent = "null" if i <= 150 else sql_string(bom_ids[(i - 151) % 150])
        drawing_rev = sql_string(revision_ids[(i - 1) % 100])
        bom_rows.append((
            sql_string(bom_id), sql_string(project_id), parent, sql_string(f"BOM-{i:04d}"),
            sql_string(f"Fabricated component or assembly {i}"), drawing_rev, str(round(1 + (i % 20) * 0.25, 4)),
            sql_string("EA" if i % 4 else "KG"), sql_string("ASTM / IS industrial specification"),
        ))
    insert("bom_items", ["id", "project_id", "parent_bom_item_id", "item_code", "description", "drawing_revision_id", "quantity", "unit", "material_specification"], bom_rows, out)

    quality_plan_ids = [uid(f"quality-plan-{i}") for i in range(1, 51)]
    quality_plans = []
    for i, plan_id in enumerate(quality_plan_ids, 1):
        points = [{"check": "Dimensional tolerance", "acceptance": "Drawing specified"}, {"check": "Visual weld inspection", "acceptance": "No critical indication"}]
        quality_plans.append((
            sql_string(plan_id), sql_string(f"QP-{i:04d}"), sql_string(project_ids[i - 1]),
            sql_string(bom_ids[(i - 1) * 6]), sql_string(f"Quality plan for project {i}"), sql_string("A"),
            sql_string("approved" if i % 4 else "under_review"), sql_json(points),
            sql_string("quality-documents"), sql_string(f"quality-plans/{plan_id}/QP.pdf"),
            sql_string(profile_ids[engineer]) if i % 4 == 0 else "null",
            sql_string("2025-07-01T09:00:00+00:00") if i % 4 == 0 else "null",
            sql_string(profile_ids[engineer]),
        ))
    insert("quality_plans", ["id", "plan_number", "project_id", "bom_item_id", "title", "revision", "status", "inspection_points", "storage_bucket", "storage_object_path", "approved_by", "approved_at", "created_by"], quality_plans, out)

    wps_ids = [uid(f"wps-{i}") for i in range(1, 16)]
    wps_rows = []
    for i, wps_id in enumerate(wps_ids, 1):
        wps_rows.append((
            sql_string(wps_id), sql_string(f"WPS-RPR-{i:03d}"), sql_string(f"{(i % 3) + 1}"),
            sql_string(["SMAW","GMAW","GTAW","SAW"][i % 4]),
            sql_string(["IS 2062 E250","SA516 Gr.70","S355JR"][i % 3]),
            sql_string(["E7018","ER70S-6","ER80S-D2","EM12K"][i % 4]),
            sql_string(["Butt","Fillet","Socket"][i % 3]), sql_string(["1G","2G","3G","5G"][i % 4]),
            sql_string(f"{3 + i % 15}-{25 + i % 40} mm"),
            sql_string(json.dumps({"current_range": "80-220 A", "voltage_range": "18-28 V", "travel_speed": "120-350 mm/min"})),
            sql_string("approved"), sql_string(profile_ids[12]), sql_string("2025-01-15T08:00:00+00:00"), sql_string(profile_ids[12]),
        ))
    insert("welding_procedure_specifications", ["id","wps_number","revision","welding_process","base_material_grade","filler_material","joint_type","position","thickness_range","parameters","status","approved_by","approved_at","created_by"], wps_rows, out)

    welder_rows, pqr_rows, weld_requirement_rows = [], [], []
    for i in range(1, 31):
        welder_rows.append((
            sql_string(uid(f"welder-{i}")), sql_string(f"WQ-{i:04d}"), sql_string(f"WLD-{1000+i}"),
            sql_string(f"Welder {fake.last_name()} {i:02d}"), sql_string(wps_ids[(i - 1) % 15]),
            sql_string(["SMAW","GMAW","GTAW","SAW"][i % 4]), "ARRAY['1G','2G','3G','5G']::text[]",
            sql_string(f"{3 + i % 10}-{20 + i % 20} mm"), sql_string(["P1","P2","P3"][i % 3]),
            sql_string("2025-01-01"), sql_string("2027-12-31"), sql_string("qualified"), sql_string(profile_ids[12]),
        ))
    insert("welder_qualification_records", ["id","qualification_number","welder_id","welder_name","wps_id","welding_process","weld_positions","thickness_range","material_group","qualification_date","expiry_date","status","created_by"], welder_rows, out)
    for i in range(1, 16):
        pqr_rows.append((
            sql_string(uid(f"pqr-{i}")), sql_string(f"PQR-RPR-{i:03d}"), sql_string(wps_ids[(i - 1) % 15]),
            sql_string(["SMAW","GMAW","GTAW","SAW"][i % 4]), sql_string(["IS 2062 E250","SA516 Gr.70"][i % 2]),
            sql_string(json.dumps({"specimen": "Test coupon 300 x 150 mm", "thickness_mm": 12 + i % 20})),
            sql_string(json.dumps({"pass": True, "ultimate_strength_mpa": 480 + i})),
            sql_string(json.dumps({"pass": True, "acceptable": True})),
            sql_string(json.dumps({"UT": "accept", "RT": "accept"})), sql_string("qualified"),
            sql_string("2025-02-01"), sql_string(profile_ids[12]), sql_string("2025-02-05T12:00:00+00:00"),
        ))
    insert("welding_procedure_qualifications", ["id","pqr_number","wps_id","welding_process","base_material_grade","test_specimen_details","tensile_results","bend_results","ndt_results","status","qualification_date","approved_by","approved_at"], pqr_rows, out)

    requirement_rows = []
    for i, plan_id in enumerate(quality_plan_ids, 1):
        methods = ["UT","RT"] if i % 3 == 0 else ["UT","MT"] if i % 3 == 1 else ["RT","PT"]
        requirement_rows.append((
            sql_string(uid(f"weld-requirement-{i}")), sql_string(plan_id),
            sql_string(["Structural weld","Pressure weld","Critical weld"][i % 3]),
            "ARRAY[" + ",".join(f"'{method}'" for method in methods) + "]::varchar[]",
            sql_string(["ASME Sec IX / Sec V","AWS D1.1","ISO 17637"][i % 3]),
            sql_string(["100%","10%","20%"][i % 3]), "true" if i % 4 == 0 else "false",
        ))
    insert("welding_quality_requirements", ["id","quality_plan_id","weld_class","required_ndt_methods","acceptance_criteria_reference","inspection_extent","hold_point"], requirement_rows, out)

    material_ids = [uid(f"material-{i}") for i in range(1, 101)]
    materials = []
    grades = ["IS2062 E250", "SA516 Gr.70", "SS304", "EN8", "ASTM A36"]
    units = ["KG", "EA", "M", "TONNE", "SQM"]
    for i, material_id in enumerate(material_ids, 1):
        materials.append((
            sql_string(material_id), sql_string(f"MAT-{i:04d}"), sql_string(f"Industrial material grade {grades[i % len(grades)]}"),
            sql_string(f"Synthetic raw material batch stock {i}"), sql_string(units[i % len(units)]),
            sql_string(grades[i % len(grades)]), "true",
        ))
    insert("materials", ["id", "material_code", "name", "description", "unit", "specification", "active"], materials, out)

    supplier_ids = [uid(f"supplier-{i}") for i in range(1, 16)]
    suppliers = []
    for i, supplier_id in enumerate(supplier_ids, 1):
        suppliers.append((
            sql_string(supplier_id), sql_string(f"SUP-{i:03d}"), sql_string(f"{fake.company()} Engineering Supply {i}"),
            sql_string(f"sales{i:02d}@supplier.example.invalid"), sql_string(fake.phone_number()[:30]),
            sql_string(fake.name()), sql_string(fake.address().replace("\n", ", ")),
            sql_string(f"22BBBB{i:04d}B1Z1"), "true" if i % 5 else "false", "true",
        ))
    insert("suppliers", ["id", "code", "name", "email", "phone", "contact_person", "address", "gst_number", "approved", "active"], suppliers, out)

    po_ids = [uid(f"po-{i}") for i in range(1, 61)]
    po_statuses = ["draft", "issued", "partially_received", "received", "cancelled", "closed"]
    purchase_orders = []
    po_items = []
    for i, po_id in enumerate(po_ids, 1):
        ordered_on = base + timedelta(days=30 + i * 5)
        status = po_statuses[(i - 1) % len(po_statuses)]
        purchase_orders.append((
            sql_string(po_id), sql_string(f"PO-JSPL-{i:04d}"), sql_string(supplier_ids[(i - 1) % 15]),
            sql_string(project_ids[(i - 1) % 50]), sql_string(status), sql_date(ordered_on),
            sql_date(ordered_on + timedelta(days=45)), sql_string("INR"), sql_string("Synthetic procurement order"),
            sql_string(profile_ids[9 + i % 10]),
        ))
        # Every PO has at least two items; later receipts use 100 of these 120 items.
        item_id = uid(f"po-item-{i}-1")
        po_items.append((sql_string(item_id), sql_string(po_id), sql_string(bom_ids[(i - 1) % 300]), sql_string(f"POITEM-{i:04d}-1"), sql_string("Primary raw material requirement"), str(100 + i), str(100 if status in ("received", "closed") else 0), sql_string("KG"), str(750 + i)))
        item_id_2 = uid(f"po-item-{i}-2")
        po_items.append((sql_string(item_id_2), sql_string(po_id), sql_string(bom_ids[(i + 49) % 300]), sql_string(f"POITEM-{i:04d}-2"), sql_string("Auxiliary fabrication material"), str(50 + i), str(50 if status in ("received", "closed") else 0), sql_string("EA"), str(1200 + i)))
    insert("purchase_orders", ["id", "po_number", "supplier_id", "project_id", "status", "order_date", "expected_delivery_date", "currency", "notes", "created_by"], purchase_orders, out)
    insert("purchase_order_items", ["id", "purchase_order_id", "bom_item_id", "item_code", "description", "ordered_quantity", "received_quantity", "unit", "unit_price"], po_items, out)

    receipt_ids = [uid(f"receipt-{i}") for i in range(1, 101)]
    receipt_rows = []
    receipt_statuses = ["pending_inspection", "accepted", "rejected", "partially_accepted"]
    used_item_indexes = list(range(120))
    random.shuffle(used_item_indexes)
    for i, receipt_id in enumerate(receipt_ids, 1):
        po_item = po_items[used_item_indexes[i - 1]]
        po_item_id = po_item[0]
        po_index = (i - 1) % 60
        received_at = base + timedelta(days=80 + i * 4)
        status = receipt_statuses[(i - 1) % len(receipt_statuses)]
        receipt_rows.append((
            sql_string(receipt_id), sql_string(f"MRN-{i:04d}"), po_item_id, sql_string(material_ids[(i - 1) % 100]),
            sql_string(supplier_ids[po_index % 15]), str(80 + i % 40), sql_string("KG"),
            sql_string(received_at.isoformat() + "T08:00:00+00:00"), sql_string(f"H{i:05d}"), sql_string(f"BATCH-{i:04d}"),
            sql_string(status if status != "accepted" else "pending_inspection" if i % 10 == 0 else "accepted"), sql_string(profile_ids[9]),
            str(1.5 + i % 80), str(1000 + i * 13), str(2000 + i * 17), str(round((80 + i % 40) * (1.5 + i % 80) * 0.00785, 4)),
            sql_string(["Steel plate","Structural section","Steel pipe"][i % 3]),
        ))
    insert("material_receipts", ["id", "receipt_number", "purchase_order_item_id", "material_id", "supplier_id", "received_quantity", "unit", "received_at", "heat_number", "batch_number", "status", "received_by", "thickness_mm", "width_mm", "length_mm", "weight_kg", "material_description"], receipt_rows, out)

    incoming_ids = [uid(f"incoming-{i}") for i in range(1, 101)]
    incoming_rows = []
    incoming_results = ["pending", "accepted", "rejected", "conditionally_accepted"]
    for i, incoming_id in enumerate(incoming_ids, 1):
        qty = 80 + i % 40
        result = incoming_results[(i - 1) % len(incoming_results)]
        accepted = 0 if result == "pending" else qty - (i % 8 + 1) if result != "rejected" else 0
        rejected = 0 if result in ("pending", "accepted", "conditionally_accepted") and result != "accepted" else qty - accepted if result == "rejected" else min(i % 7 + 1, qty)
        if result == "accepted":
            accepted, rejected = qty, 0
        incoming_rows.append((
            sql_string(incoming_id), sql_string(f"INQI-{i:04d}"), sql_string(receipt_ids[i - 1]),
            sql_string(f"2025-{(1 + i % 12):02d}-{(1 + i % 27):02d}"),
            sql_string(result), sql_json({"dimensional": "verified", "certificate": "checked"}),
            str(qty), str(accepted), str(rejected), sql_string(profile_ids[12 + i % 8]),
            sql_string("Synthetic incoming inspection record"), sql_string("2025-07-01T12:00:00+00:00") if result != "pending" else "null",
        ))
    insert("incoming_inspections", ["id", "inspection_number", "material_receipt_id", "inspection_date", "result", "observations", "inspected_quantity", "accepted_quantity", "rejected_quantity", "inspector_id", "remarks", "completed_at"], incoming_rows, out)

    job_ids = [uid(f"job-{i}") for i in range(1, 51)]
    job_rows = []
    job_statuses = ["planned", "released", "in_progress", "paused", "completed", "cancelled"]
    for i, job_id in enumerate(job_ids, 1):
        quantity = 20 + i
        status = job_statuses[(i - 1) % len(job_statuses)]
        completed = quantity if status == "completed" else quantity // 3 if status == "in_progress" else 0
        rejected = (i % 3) if status != "planned" else 0
        if status == "planned":
            rejected = 0
        start = date(2025, 2, (i % 28) + 1)
        job_rows.append((
            sql_string(job_id), sql_string(f"JOB-{i:04d}"), sql_string(project_ids[(i - 1) % 50]),
            sql_string(bom_ids[(i - 1) * 6]), sql_string(quality_plan_ids[i - 1]),
            sql_string(revision_ids[(i - 1) % 100]), sql_string(status), str(quantity),
            str(completed), str(rejected), sql_string("2025-04-01T08:00:00+00:00"),
            sql_string("2025-04-30T18:00:00+00:00"), sql_string("2025-04-01T08:00:00+00:00") if status != "planned" else "null",
            sql_string("2025-04-30T18:00:00+00:00") if status == "completed" else "null",
            sql_string(profile_ids[20 + i % 7]),
        ))
    insert("production_jobs", ["id", "job_number", "project_id", "bom_item_id", "quality_plan_id", "drawing_revision_id", "status", "quantity", "completed_quantity", "rejected_quantity", "planned_start_at", "planned_end_at", "actual_start_at", "actual_end_at", "supervisor_id"], job_rows, out)

    stage_ids = [uid(f"stage-{i}") for i in range(1, 151)]
    stage_rows = []
    stage_names = ["Material Preparation", "Cutting", "Fit-up", "Welding", "Heat Treatment", "Machining", "Surface Treatment", "Final Assembly"]
    stage_statuses = ["planned", "released", "in_progress", "paused", "completed", "cancelled"]
    for i, stage_id in enumerate(stage_ids, 1):
        job_index = (i - 1) // 3
        stage_sequence = (i - 1) % 3 + 1
        status = stage_statuses[(i - 1) % len(stage_statuses)]
        stage_rows.append((
            sql_string(stage_id), sql_string(job_ids[job_index]), str(stage_sequence),
            sql_string(stage_names[(i - 1) % len(stage_names)]), sql_string("Synthetic manufacturing operation stage"),
            sql_string(status), str(20 + job_index), sql_string("2025-05-01T08:00:00+00:00") if status != "planned" else "null",
            sql_string("2025-05-01T16:00:00+00:00") if status == "completed" else "null",
            sql_string(profile_ids[20 + i % 7]),
        ))
    insert("production_stages", ["id", "production_job_id", "stage_sequence", "name", "description", "status", "quantity", "started_at", "completed_at", "operator_id"], stage_rows, out)

    mtc_rows = []
    for i, receipt_id in enumerate(receipt_ids, 1):
        mtc_rows.append((
            sql_string(uid(f"mtc-{i}")), sql_string(f"MTC-RPR-{i:04d}"),
            sql_string(supplier_ids[(i - 1) % 15]), sql_string(receipt_id),
            sql_string(f"H{i:05d}"), sql_string(["IS 2062 E250","IS 2062 E350","SA516 Gr.70","EN 10025 S355JR"][i % 4]),
            sql_string(["IS 2062","IS 2062","ASTM A516","EN 10025"][i % 4]),
            sql_json({"C": round(0.12 + (i % 10) * 0.002, 3), "Mn": round(0.8 + (i % 8) * 0.05, 2)}),
            sql_json({"yield_strength_mpa": 250 + i % 100, "tensile_strength_mpa": 410 + i % 120}),
            sql_string("accepted" if i % 5 else "verified"),
            sql_string("Synthetic MTC supplier record"),
        ))
    insert("material_test_certificates", ["id","mtc_number","supplier_id","material_receipt_id","heat_number","steel_grade","material_standard","chemical_composition","mechanical_properties","certificate_status","remarks"], mtc_rows, out)

    weld_rows, ndt_rows, hydro_rows, trace_rows = [], [], [], []
    welding_processes = ["SMAW", "GMAW", "GTAW", "SAW"]
    for i, job_id in enumerate(job_ids, 1):
        stage_id = stage_ids[((i - 1) * 3) % 150]
        weld_rows.append((
            sql_string(uid(f"weld-{i}")),             sql_string(f"WD-{i:04d}-1"),
            sql_string(job_id), sql_string(stage_id), sql_string(f"J-{i:04d}"),
            sql_string(f"WLD-{1000+i}"), sql_string(welding_processes[(i - 1) % len(welding_processes)]),
            sql_string(["1G","2G","3G","5G","6G"][i % 5]), sql_string(["E7018","ER70S-6","ER80S-D2","EM12K"][i % 4]),
            sql_string(f"BATCH-W{(i % 20)+1:03d}"), sql_string(["IS 2062 E250","SA516 Gr.70"][i % 2]),
            sql_string(f"WPS-RPR-{(i % 15)+1:03d}"), sql_date(base + timedelta(days=250+i)),
            sql_string("accepted" if i % 6 else "repair_required"), sql_string("Synthetic machinery weld record"),
            sql_string(profile_ids[20]),
        ))
        ndt_rows.append((
            sql_string(uid(f"ndt-{i}")), sql_string(f"NDT-{i:04d}"), sql_string(job_id),
            sql_string(uid(f"weld-{i}")), "null", sql_string(["VT","UT","RT","MT","PT"][i % 5]),
            sql_string(["ASME Section VIII","AWS D1.1","ISO 17638"][i % 3]),
            sql_string(f"NDT-PROC-{(i % 8)+1:02d}"), sql_string(f"NDT Technician {i:02d}"),
            sql_date(base + timedelta(days=255+i)), sql_json([]),
            sql_string("acceptable" if i % 7 else "reinspect"), sql_string(profile_ids[12]),
        ))
        if i <= 25:
            hydro_rows.append((
                sql_string(uid(f"hydro-{i}")), sql_string(f"HYD-{i:04d}"), sql_string(job_id),
                sql_string(f"EQUIP-{i:04d}"), sql_string("Water"), str(8 + i % 12), sql_string("bar"),
                str(30 + i % 60), str(25 + i % 10), sql_string(f"PG-{i:04d}"),
                sql_date(base + timedelta(days=300+i)), sql_string("passed" if i % 5 else "reinspect"),
                sql_string(f"Customer Witness {i:02d}"), sql_string("JSPL Raipur Machinery Division QA"),
                sql_string(profile_ids[12]),
            ))
        receipt_id = receipt_ids[(i - 1) % 100]
        trace_rows.append((
            sql_string(uid(f"trace-{i}")), sql_string(job_id), sql_string(stage_id),
            sql_string(receipt_id), sql_string(bom_ids[(i - 1) % 300]),
            sql_string(f"EQ-{i:04d}"), sql_string(f"ASM-{i:04d}-{1 + i % 4}"),
            sql_string(f"H{((i-1)%100)+1:05d}"), sql_string(f"BATCH-{((i-1)%100)+1:04d}"),
            str(40 + i % 30), str(i % 4), sql_string("KG"), sql_string(profile_ids[20]),
        ))
    insert("weld_records", ["id","weld_number","production_job_id","production_stage_id","joint_number","welder_id","welding_process","welding_position","filler_material","filler_heat_or_batch","base_material_grade","wps_number","weld_date","result","remarks","created_by"], weld_rows, out)
    insert("ndt_records", ["id","ndt_number","production_job_id","weld_record_id","quality_inspection_id","ndt_method","acceptance_standard","procedure_number","technician","test_date","indications","result","reviewed_by"], ndt_rows, out)
    insert("hydrostatic_tests", ["id","test_number","production_job_id","equipment_tag","test_medium","test_pressure","pressure_unit","holding_time_minutes","test_temperature","calibrated_gauge_numbers","test_date","result","witnessed_by","witness_organization","recorded_by"], hydro_rows, out)
    insert("manufacturing_traceability", ["id","production_job_id","production_stage_id","material_receipt_id","bom_item_id","finished_equipment_serial","component_identification","heat_number","batch_number","consumed_quantity","scrap_quantity","unit","created_by"], trace_rows, out)

    allocation_rows = []
    for i in range(1, 51):
        receipt_id = receipt_ids[(i - 1) % 100]
        allocation_rows.append((
            sql_string(uid(f"steel-allocation-{i}")), sql_string(receipt_id), sql_string(job_ids[(i - 1) % 50]),
            sql_string(stage_ids[((i - 1) * 3) % 150]), sql_string(bom_ids[(i - 1) % 300]),
            str(20 + i % 10), str(5 + i % 5), str(i % 2),
            sql_string("KG"), sql_string(f"EQ-{i:04d}"), sql_string(f"ASM-{i:04d}-{1 + i % 4}"),
            sql_string("partially_consumed" if i % 2 else "consumed"),
            sql_string("Synthetic accepted steel heat/batch allocation"), sql_string(profile_ids[20]),
        ))
    insert("steel_material_allocations", ["id","material_receipt_id","production_job_id","production_stage_id","bom_item_id","allocated_quantity","consumed_quantity","scrap_quantity","unit","finished_equipment_serial","component_identification","status","remarks","allocated_by"], allocation_rows, out)

    inspection_ids = [uid(f"quality-inspection-{i}") for i in range(1, 201)]
    inspection_rows = []
    inspection_results = ["pending", "accepted", "rejected", "conditionally_accepted"]
    for i, inspection_id in enumerate(inspection_ids, 1):
        stage_id = stage_ids[(i - 1) % 150]
        result = inspection_results[(i - 1) % len(inspection_results)]
        measured = {"dimension_mm": round(49.8 + i % 5 * 0.1, 2), "tolerance_mm": 0.5, "visual_weld_acceptance": result != "rejected"}
        inspection_rows.append((
            sql_string(inspection_id), sql_string(f"QIN-{i:04d}"), "null",
            sql_string(stage_id), sql_string(quality_plan_ids[(i - 1) % 50]),
            sql_string(f"2025-{(1 + i % 12):02d}-{(1 + i % 27):02d}"), sql_string(result),
            sql_json({"observation": "Synthetic shop-floor dimensional and visual check", "instrument": "Caliper/UTM"}),
            sql_json(measured), sql_string(profile_ids[12 + i % 8]),
            sql_string("Rejected: requires rework" if result == "rejected" else "Inspection record generated"),
            sql_string("2025-07-02T12:00:00+00:00") if result != "pending" else "null",
        ))
    insert("quality_inspections", ["id", "inspection_number", "production_job_id", "production_stage_id", "quality_plan_id", "inspection_date", "result", "observations", "measured_values", "inspector_id", "remarks", "completed_at"], inspection_rows, out)

    ncr_ids = [uid(f"ncr-{i}") for i in range(1, 31)]
    ncr_rows = []
    ncr_statuses = ["open", "under_disposition", "corrective_action", "closed", "rejected"]
    severities = ["minor", "major", "critical"]
    for i, ncr_id in enumerate(ncr_ids, 1):
        source = inspection_ids[(i - 1) * 6 + 2]
        status = ncr_statuses[(i - 1) % len(ncr_statuses)]
        ncr_rows.append((
            sql_string(ncr_id), sql_string(f"NCR-{i:04d}"), sql_string(source),
            "null", "null", sql_string(f"Dimensional nonconformance {i}"),
            sql_string("Measured characteristic was outside the approved drawing tolerance."),
            sql_string(severities[(i - 1) % 3]), sql_string(status),
            sql_string("Material quarantined and affected units identified."),
            sql_string("Accept as-is" if i % 7 == 0 else "Rework and reinspection required."),
            sql_string(profile_ids[12]), sql_string(profile_ids[1]) if status == "closed" else "null",
            sql_string("2025-08-01T10:00:00+00:00") if status == "closed" else "null",
        ))
    insert("non_conformance_reports", ["id", "ncr_number", "quality_inspection_id", "incoming_inspection_id", "production_job_id", "title", "description", "severity", "status", "containment_action", "disposition", "reported_by", "closed_by", "closed_at"], ncr_rows, out)

    action_ids = [uid(f"capa-{i}") for i in range(1, 31)]
    action_rows = []
    action_statuses = ["open", "in_progress", "completed", "verified", "cancelled"]
    for i, action_id in enumerate(action_ids, 1):
        status = action_statuses[(i - 1) % len(action_statuses)]
        action_rows.append((
            sql_string(action_id), sql_string(f"CAPA-{i:04d}"), sql_string(ncr_ids[i - 1]),
            sql_string(f"Corrective and preventive action {i}"),
            sql_string("Close the detected dimensional or process variation and prevent recurrence."),
            sql_string("Uncontrolled setup method and incomplete operator verification."),
            sql_string("Reset process parameters and rework affected quantity."),
            sql_string("Update work instruction and add layered process audit."),
            sql_string(status), sql_string(profile_ids[12 + i % 8]),
            sql_date(date(2025, 9, 1) + timedelta(days=i)), sql_string("2025-09-02T10:00:00+00:00") if status in ("completed", "verified") else "null",
            sql_string(profile_ids[12]) if status == "verified" else "null",
            sql_string("2025-09-03T10:00:00+00:00") if status == "verified" else "null",
        ))
    insert("corrective_actions", ["id", "action_number", "ncr_id", "title", "description", "root_cause", "corrective_measure", "preventive_measure", "status", "owner_id", "due_date", "completed_at", "verified_by", "verified_at"], action_rows, out)

    reinspection_ids = [uid(f"reinspection-{i}") for i in range(1, 31)]
    reinspection_rows = []
    reinspect_results = ["pending", "accepted", "rejected", "conditionally_accepted"]
    for i, reinspection_id in enumerate(reinspection_ids, 1):
        result = reinspect_results[(i - 1) % len(reinspect_results)]
        reinspection_rows.append((
            sql_string(reinspection_id), sql_string(f"REIN-{i:04d}"), sql_string(ncr_ids[i - 1]),
            sql_string(action_ids[i - 1]), sql_string(f"2025-{(7 + i % 5):02d}-{(1 + i % 27):02d}"),
            sql_string(result), sql_json({"verification": "Corrective action completed", "characteristic": "within drawing tolerance" if result == "accepted" else "repeat deviation" }),
            sql_string(profile_ids[12 + i % 8]), sql_string("Reworked and reinspected under synthetic CAPA scenario"),
        ))
    insert("reinspection_records", ["id", "reinspection_number", "ncr_id", "corrective_action_id", "inspection_date", "result", "observations", "inspector_id", "remarks"], reinspection_rows, out)

    final_ids = [uid(f"final-{i}") for i in range(1, 51)]
    final_rows = []
    final_results = ["pending", "accepted", "rejected", "conditionally_accepted"]
    for i, final_id in enumerate(final_ids, 1):
        qty = 20 + i
        result = final_results[(i - 1) % len(final_results)]
        accepted = qty if result == "accepted" else 0 if result in ("pending", "rejected") else qty - i % 3
        rejected = 0 if result != "rejected" else i % 3 + 1
        final_rows.append((
            sql_string(final_id), sql_string(f"FIN-{i:04d}"), sql_string(job_ids[(i - 1) % 50]),
            sql_string(result), sql_string(f"2025-{(7 + i % 5):02d}-{(1 + i % 27):02d}"),
            sql_string(f"COC-JSPL-{i:04d}") if result == "accepted" else "null",
            sql_json({"release_document": "checked", "packaging": "verified"}),
            str(qty), str(accepted), str(rejected), sql_string(profile_ids[12 + i % 8]),
            sql_string(profile_ids[12]) if result == "accepted" else "null",
            sql_string("2025-09-01T10:00:00+00:00") if result == "accepted" else "null",
        ))
    insert("final_inspections", ["id", "inspection_number", "production_job_id", "result", "inspection_date", "certificate_number", "observations", "inspected_quantity", "accepted_quantity", "rejected_quantity", "inspector_id", "approved_by", "approved_at"], final_rows, out)

    dispatch_ids = [uid(f"dispatch-{i}") for i in range(1, 31)]
    dispatch_rows = []
    dispatch_statuses = ["planned", "packed", "dispatched", "delivered", "cancelled"]
    accepted_final_indexes = [i for i in range(1, 51) if i % 4 == 2]
    for i, dispatch_id in enumerate(dispatch_ids, 1):
        final_index = accepted_final_indexes[(i - 1) % len(accepted_final_indexes)]
        status = dispatch_statuses[(i - 1) % len(dispatch_statuses)]
        dispatch_date = date(2025, 10, 1) + timedelta(days=i * 2)
        dispatch_rows.append((
            sql_string(dispatch_id), sql_string(f"DN-{i:04d}"),
            sql_string(order_ids[(final_index - 1) % 50]), sql_string(final_ids[final_index - 1]),
            sql_string(status), str(20 + final_index), sql_date(dispatch_date),
            sql_string(f"CG{10+i}AB{1000+i}") if status != "cancelled" else "null",
            sql_string(f"LR-JSPL-{i:04d}") if status != "planned" else "null",
            sql_string(fake.address().replace("\n", ", ")), sql_string(profile_ids[27]),
            sql_string(dispatch_date.isoformat() + "T16:00:00+00:00") if status == "delivered" else "null",
        ))
    insert("dispatches", ["id", "dispatch_number", "order_id", "final_inspection_id", "status", "quantity", "dispatch_date", "vehicle_number", "lr_number", "destination", "dispatched_by", "delivered_at"], dispatch_rows, out)

    out.extend([
        "",
        "-- Validate all requested synthetic workflow counts.",
        "do $$",
        "declare expected constant jsonb := '{\"customers\":20,\"profiles\":30,\"suppliers\":15,\"orders\":50,\"projects\":50,\"engineering_drawings\":100,\"bom_items\":300,\"materials\":100,\"purchase_orders\":60,\"material_receipts\":100,\"incoming_inspections\":100,\"production_jobs\":50,\"production_stages\":150,\"quality_inspections\":200,\"final_inspections\":50,\"dispatches\":30}'::jsonb;",
        "begin",
        "  if (select count(*) from public.customers) <> (expected->>'customers')::bigint then raise exception 'customers count mismatch'; end if;",
        "  if (select count(*) from public.profiles) <> (expected->>'profiles')::bigint then raise exception 'profiles count mismatch'; end if;",
        "  if (select count(*) from public.suppliers) <> (expected->>'suppliers')::bigint then raise exception 'suppliers count mismatch'; end if;",
        "  if (select count(*) from public.orders) <> (expected->>'orders')::bigint then raise exception 'orders count mismatch'; end if;",
        "  if (select count(*) from public.projects) <> (expected->>'projects')::bigint then raise exception 'projects count mismatch'; end if;",
        "  if (select count(*) from public.engineering_drawings) <> (expected->>'engineering_drawings')::bigint then raise exception 'engineering_drawings count mismatch'; end if;",
        "  if (select count(*) from public.bom_items) <> (expected->>'bom_items')::bigint then raise exception 'bom_items count mismatch'; end if;",
        "  if (select count(*) from public.materials) <> (expected->>'materials')::bigint then raise exception 'materials count mismatch'; end if;",
        "  if (select count(*) from public.purchase_orders) <> (expected->>'purchase_orders')::bigint then raise exception 'purchase_orders count mismatch'; end if;",
        "  if (select count(*) from public.material_receipts) <> (expected->>'material_receipts')::bigint then raise exception 'material_receipts count mismatch'; end if;",
        "  if (select count(*) from public.incoming_inspections) <> (expected->>'incoming_inspections')::bigint then raise exception 'incoming_inspections count mismatch'; end if;",
        "  if (select count(*) from public.production_jobs) <> (expected->>'production_jobs')::bigint then raise exception 'production_jobs count mismatch'; end if;",
        "  if (select count(*) from public.production_stages) <> (expected->>'production_stages')::bigint then raise exception 'production_stages count mismatch'; end if;",
        "  if (select count(*) from public.quality_inspections) <> (expected->>'quality_inspections')::bigint then raise exception 'quality_inspections count mismatch'; end if;",
        "  if (select count(*) from public.final_inspections) <> (expected->>'final_inspections')::bigint then raise exception 'final_inspections count mismatch'; end if;",
        "  if (select count(*) from public.dispatches) <> (expected->>'dispatches')::bigint then raise exception 'dispatches count mismatch'; end if;",
        "  if exists (select 1 from public.material_receipts r left join public.purchase_order_items i on i.id = r.purchase_order_item_id where i.id is null) then raise exception 'orphan material receipt'; end if;",
        "  if exists (select 1 from public.production_stages s left join public.production_jobs j on j.id = s.production_job_id where j.id is null) then raise exception 'orphan production stage'; end if;",
        "  if exists (select 1 from public.dispatches d left join public.final_inspections f on f.id = d.final_inspection_id where f.id is null) then raise exception 'orphan dispatch'; end if;",
        "end;",
        "$$;",
        "commit;",
        "",
    ])
    return "\n".join(out) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="supabase/seed.sql", help="Output PostgreSQL seed path")
    args = parser.parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_seed(), encoding="utf-8")
    print(f"Generated {output}")


if __name__ == "__main__":
    main()
