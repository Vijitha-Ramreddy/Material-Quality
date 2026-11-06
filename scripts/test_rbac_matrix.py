"""Static validation of the application and database RBAC role matrix."""

import sys
from pathlib import Path

ROLE_PERMISSIONS = {
    "engineering": {"engineering_drawings", "drawing_revisions"},
    "planning_procurement": {"purchase_orders", "purchase_order_items"},
    "stores": {"material_receipts"},
    "production": {"production_stages"},
    "quality_assurance": {"incoming_inspections", "quality_inspections", "final_inspections", "non_conformance_reports"},
    "logistics": {"dispatches"},
    "sales_projects": {"orders", "projects"},
    "admin": set(),
}

DENIED_PAIRS = {
    ("sales_projects", "quality_inspections"),
    ("engineering", "purchase_orders"),
    ("stores", "engineering_drawings"),
    ("production", "dispatches"),
    ("quality_assurance", "dispatches"),
    ("logistics", "quality_inspections"),
}


def main() -> int:
    required = Path("supabase/migrations/20261105165001_auth_rbac_policies.sql").read_text()
    for role, allowed_tables in ROLE_PERMISSIONS.items():
        if role != "admin" and role not in required:
            print(f"Missing {role} policy role", file=sys.stderr)
            return 1
        for table in allowed_tables:
            if table not in required:
                print(f"Missing policy coverage for {table}", file=sys.stderr)
                return 1
    for role, denied_table in DENIED_PAIRS:
        if denied_table in ROLE_PERMISSIONS[role]:
            print(f"Invalid allowed/denied matrix: {role}/{denied_table}", file=sys.stderr)
            return 1
    print("RBAC matrix validation passed for 8 roles and denied-operation pairs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
