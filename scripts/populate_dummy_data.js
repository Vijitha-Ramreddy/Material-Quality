/* eslint-disable */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

function uuid(name) {
  const hash = crypto.createHash("sha1").update(name).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join("-");
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  console.log("Connected to Supabase at:", url);

  // 1. Fetch default profile
  const { data: existingProfiles } = await supabase.from("profiles").select("id,role,email").limit(5);
  let defaultUserId = existingProfiles && existingProfiles[0] ? existingProfiles[0].id : null;
  console.log("Using existing user ID:", defaultUserId);

  // 2. Customers
  const customerNames = [
    "Bhilai Steel Plant", "Bokaro Steel City", "Rourkela Steel Plant", "Durgapur Steel Authority",
    "Tata Steel Jamshedpur", "JSW Steel Bellary", "Adani Heavy Engineering", "L&T Heavy Civil Infra",
    "BHEL Heavy Electricals", "Engineers India Limited", "NTPC Sipat Super Thermal", "NMDC Nagarnar Plant",
    "Vedanta Aluminium Jharsuguda", "Hindalco Renukoot", "Tata Projects Hyderabad", "HCC Heavy Structures",
    "Afcons Infrastructure", "Kalpataru Power Projects", "Reliance Infrastructure", "Essar Heavy Engineering"
  ];
  const customerRows = customerNames.map((name, i) => ({
    id: uuid(`customer-${i + 1}`),
    code: `CUST-${String(i + 1).padStart(3, "0")}`,
    name,
    email: `procurement@${name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `+91-98765${String(10000 + i).slice(-5)}`,
    contact_person: `Mr. Officer ${i + 1}`,
    billing_address: `Industrial Complex Zone ${i + 1}, Sector 4, Raipur, Chhattisgarh`,
    shipping_address: `Works Site Gate ${i + 1}, Industrial Area, Raipur, Chhattisgarh`,
    gst_number: `22AAACJ${1000 + i}A1Z${i % 9}`,
    active: true,
  }));
  const { error: custErr } = await supabase.from("customers").upsert(customerRows, { onConflict: "id" });
  console.log("Customers inserted:", customerRows.length, custErr ? custErr.message : "OK");

  // 3. Materials
  const materialList = [
    { code: "MAT-PL-IS2062", name: "Mild Steel Plate IS 2062 E250", spec: "IS 2062:2011 Grade E250", unit: "MT" },
    { code: "MAT-PL-SA516", name: "Boiler Quality Plate SA 516 Gr 70", spec: "ASME SA 516 Grade 70", unit: "MT" },
    { code: "MAT-PL-HARDOX", name: "Wear Resistant Plate Hardox 400", spec: "EN 10029 Hardox 400", unit: "MT" },
    { code: "MAT-SEC-ISMB", name: "Structural Beam ISMB 400", spec: "IS 808 / IS 2062", unit: "MT" },
    { code: "MAT-SEC-ISMC", name: "Structural Channel ISMC 250", spec: "IS 808 / IS 2062", unit: "MT" },
    { code: "MAT-PIPE-ERW", name: "Heavy Wall Steel Pipe NB 300", spec: "ASTM A106 Grade B", unit: "M" },
    { code: "MAT-WELD-E7018", name: "Low Hydrogen Welding Electrodes", spec: "AWS A5.1 E7018", unit: "KG" },
    { code: "MAT-WELD-ER70S", name: "MIG Welding Wire 1.2mm", spec: "AWS A5.18 ER70S-6", unit: "KG" },
    { code: "MAT-FLG-WN150", name: "Weld Neck Flange 150# ANSI B16.5", spec: "ASTM A105", unit: "NOS" },
    { code: "MAT-FAST-8.8", name: "High Tensile Fasteners M24x120", spec: "IS 1367 Grade 8.8", unit: "NOS" }
  ];
  const materialRows = materialList.map((m, i) => ({
    id: uuid(`material-${i + 1}`),
    material_code: m.code,
    name: m.name,
    description: `${m.name} for heavy structural and machinery fabrication`,
    specification: m.spec,
    unit: m.unit,
    active: true,
  }));
  const { error: matErr } = await supabase.from("materials").upsert(materialRows, { onConflict: "id" });
  console.log("Materials inserted:", materialRows.length, matErr ? matErr.message : "OK");

  // 4. Suppliers
  const supplierNames = [
    "Jindal Shadeed Iron & Steel", "JSPL Angul Plate Mill", "Monnet Ispat & Energy",
    "Voestalpine Bohler Welding", "Esab India Limited", "Sandvik Materials Technology",
    "Ador Welding Limited", "Unbrako Fasteners India", "Viraj Profiles Limited",
    "Tube Products of India", "Bharat Forge Industrial", "Midhani Mishra Dhatu Nigam"
  ];
  const supplierRows = supplierNames.map((name, i) => ({
    id: uuid(`supplier-${i + 1}`),
    code: `SUP-${String(i + 1).padStart(3, "0")}`,
    name,
    email: `sales@${name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: `+91-98765${String(20000 + i).slice(-5)}`,
    contact_person: `Supplier Rep ${i + 1}`,
    address: `Steel Supply Corridor Sector ${i + 1}, Industrial Zone, India`,
    gst_number: `22AAACJ${2000 + i}B1Z${i % 9}`,
    approved: true,
    active: true,
  }));
  const { error: supErr } = await supabase.from("suppliers").upsert(supplierRows, { onConflict: "id" });
  console.log("Suppliers inserted:", supplierRows.length, supErr ? supErr.message : "OK");

  // 5. Orders and Projects (50 orders)
  const orderStatuses = ["draft", "confirmed", "in_progress", "in_progress", "in_progress", "completed", "completed", "on_hold"];
  const orderProducts = [
    "Blast Furnace Hearth Cooling Stave", "Continuous Caster Tundish Car Frame",
    "Heavy Mill Stand Housing Assembly", "Ladler Turret Slewing Ring Base",
    "Sinter Plant Rotary Screen Module", "Coke Oven Door Extractor Machine Frame",
    "Hot Strip Mill Run-out Table Roller", "Pellet Plant Grate Chain Support",
    "Blast Furnace Top Gas Scrubber Vessel", "Slag Pot Carrier Chasis Structure"
  ];

  const orderRows = [];
  const projectRows = [];
  const now = new Date();

  for (let i = 1; i <= 50; i++) {
    const oId = uuid(`order-${i}`);
    const prjId = uuid(`project-${i}`);
    const custId = customerRows[(i - 1) % customerRows.length].id;
    const status = orderStatuses[(i - 1) % orderStatuses.length];
    const orderDate = new Date(now.getTime() - (55 - i) * 7 * 86400000).toISOString().slice(0, 10);
    const reqDelivery = new Date(now.getTime() + (i * 3) * 86400000).toISOString().slice(0, 10);
    const prodName = orderProducts[(i - 1) % orderProducts.length];
    const qty = 5 + (i % 20);
    const val = 1200000 + (i * 450000);

    orderRows.push({
      id: oId,
      order_number: `JSPL-ORD-${String(i).padStart(4, "0")}`,
      customer_id: custId,
      customer_po_number: `PO-JSPL-${2025 + Math.floor(i / 30)}-${String(100 + i).padStart(4, "0")}`,
      description: `Heavy engineering contract: ${prodName} - Qty: ${qty} nos - Delivery to ${customerRows[(i - 1) % customerRows.length].name}`,
      order_date: orderDate,
      required_delivery_date: reqDelivery,
      status,
      priority: (i % 5) + 1,
      currency: "INR",
      total_value: val,
      created_by: defaultUserId,
    });

    const prjStatus = status === "completed" ? "completed" : status === "draft" ? "planned" : "in_progress";
    projectRows.push({
      id: prjId,
      project_code: `PRJ-${String(i).padStart(4, "0")}`,
      order_id: oId,
      name: `Manufacturing Project: ${prodName}`,
      start_date: orderDate,
      planned_end_date: reqDelivery,
      actual_end_date: status === "completed" ? reqDelivery : null,
      status: prjStatus,
      project_manager_id: defaultUserId,
    });
  }

  const { error: ordErr } = await supabase.from("orders").upsert(orderRows, { onConflict: "id" });
  console.log("Orders inserted:", orderRows.length, ordErr ? ordErr.message : "OK");

  const { error: prjErr } = await supabase.from("projects").upsert(projectRows, { onConflict: "id" });
  console.log("Projects inserted:", projectRows.length, prjErr ? prjErr.message : "OK");

  // 6. Engineering Drawings & Revisions
  const drawingRows = [];
  const revisionRows = [];
  for (let i = 1; i <= 50; i++) {
    const dwgId = uuid(`dwg-${i}`);
    const revId = uuid(`rev-${i}`);
    const oId = orderRows[(i - 1) % orderRows.length].id;
    const isApproved = i > 10;

    drawingRows.push({
      id: dwgId,
      drawing_number: `DWG-JSPL-${String(i).padStart(4, "0")}`,
      order_id: oId,
      title: `General Arrangement & Fabrication: ${orderProducts[(i - 1) % orderProducts.length]}`,
      discipline: i % 2 === 0 ? "Mechanical" : "Structural",
      description: `Approved production shop drawing for ${orderProducts[(i - 1) % orderProducts.length]}`,
      current_revision_id: null,
      created_by: defaultUserId,
    });

    revisionRows.push({
      id: revId,
      drawing_id: dwgId,
      revision_code: "R0",
      revision_number: 1,
      status: isApproved ? "approved" : "under_review",
      file_name: `DWG-${String(i).padStart(4, "0")}_R0.pdf`,
      change_summary: "Initial release for manufacturing and QA planning",
      approved_by: isApproved ? defaultUserId : null,
      approved_at: isApproved ? new Date().toISOString() : null,
      created_by: defaultUserId,
    });
  }
  const { error: dwgErr } = await supabase.from("engineering_drawings").upsert(drawingRows, { onConflict: "id" });
  console.log("Drawings inserted:", drawingRows.length, dwgErr ? dwgErr.message : "OK");
  const { error: revErr } = await supabase.from("drawing_revisions").upsert(revisionRows, { onConflict: "id" });
  console.log("Drawing Revisions inserted:", revisionRows.length, revErr ? revErr.message : "OK");

  // Update current_revision_id on drawings
  for (let i = 0; i < drawingRows.length; i++) {
    await supabase.from("engineering_drawings").update({ current_revision_id: revisionRows[i].id }).eq("id", drawingRows[i].id);
  }

  // 7. BOM Items
  const bomRows = [];
  for (let i = 1; i <= 100; i++) {
    const prjId = projectRows[(i - 1) % projectRows.length].id;
    bomRows.push({
      id: uuid(`bom-${i}`),
      project_id: prjId,
      item_code: `BOM-PART-${String(i).padStart(4, "0")}`,
      description: `Structural sub-assembly component ${i} - ${materialList[(i - 1) % materialList.length].name}`,
      quantity: (i % 8) + 1,
      unit: "nos",
      material_specification: materialList[(i - 1) % materialList.length].spec,
    });
  }
  const { error: bomErr } = await supabase.from("bom_items").upsert(bomRows, { onConflict: "id" });
  console.log("BOM Items inserted:", bomRows.length, bomErr ? bomErr.message : "OK");

  // 8. Quality Plans
  const qpRows = [];
  for (let i = 1; i <= 30; i++) {
    const prjId = projectRows[(i - 1) % projectRows.length].id;
    const isApproved = i > 5;
    qpRows.push({
      id: uuid(`qp-${i}`),
      plan_number: `QP-JSPL-${String(i).padStart(4, "0")}`,
      project_id: prjId,
      title: `Quality Assurance Plan for ${orderProducts[(i - 1) % orderProducts.length]}`,
      revision: "1",
      status: isApproved ? "approved" : "under_review",
      inspection_points: [
        { stage: "Raw Material", check: "MTC & PMI verification", criteria: "100% heat match" },
        { stage: "Welding", check: "WPS & NDT testing", criteria: "100% Visual + 20% UT/RT" },
        { stage: "Machining", check: "Dimensional check", criteria: "+/- 0.5mm" },
        { stage: "Final Assembly", check: "Hydrostatic / Load Test", criteria: "1.5x working pressure" }
      ],
      created_by: defaultUserId,
    });
  }
  const { error: qpErr } = await supabase.from("quality_plans").upsert(qpRows, { onConflict: "id" });
  console.log("Quality Plans inserted:", qpRows.length, qpErr ? qpErr.message : "OK");

  // 9. Purchase Orders & Items
  const poRows = [];
  const poItemRows = [];
  const poStatuses = ["issued", "partially_received", "received", "closed"];
  for (let i = 1; i <= 40; i++) {
    const poId = uuid(`po-${i}`);
    const supId = supplierRows[(i - 1) % supplierRows.length].id;
    const prjId = projectRows[(i - 1) % projectRows.length].id;
    const poDate = new Date(now.getTime() - (45 - i) * 6 * 86400000).toISOString().slice(0, 10);
    const expDelivery = new Date(now.getTime() + (i * 2) * 86400000).toISOString().slice(0, 10);

    poRows.push({
      id: poId,
      po_number: `PO-SUP-${String(i).padStart(4, "0")}`,
      supplier_id: supId,
      project_id: prjId,
      status: poStatuses[i % poStatuses.length],
      order_date: poDate,
      expected_delivery_date: expDelivery,
      currency: "INR",
      notes: `Supply of certified steel plates & consumables for Project ${projectRows[(i - 1) % projectRows.length].project_code}`,
      created_by: defaultUserId,
    });

    const mat = materialRows[(i - 1) % materialRows.length];
    poItemRows.push({
      id: uuid(`po-item-${i}`),
      purchase_order_id: poId,
      item_code: mat.material_code,
      description: mat.name,
      ordered_quantity: 10 + i * 2,
      received_quantity: i > 15 ? 10 + i * 2 : Math.floor((10 + i * 2) * 0.7),
      unit: mat.unit,
      unit_price: 65000 + (i * 2500),
    });
  }
  const { error: poErr } = await supabase.from("purchase_orders").upsert(poRows, { onConflict: "id" });
  console.log("Purchase Orders inserted:", poRows.length, poErr ? poErr.message : "OK");
  const { error: poiErr } = await supabase.from("purchase_order_items").upsert(poItemRows, { onConflict: "id" });
  console.log("PO Items inserted:", poItemRows.length, poiErr ? poiErr.message : "OK");

  // 10. Material Receipts & Incoming Inspections
  const receiptRows = [];
  const incomingRows = [];
  const receiptStatuses = ["pending_inspection", "accepted", "accepted", "rejected"];
  for (let i = 1; i <= 40; i++) {
    const rcptId = uuid(`rcpt-${i}`);
    const poItem = poItemRows[(i - 1) % poItemRows.length];
    const supId = supplierRows[(i - 1) % supplierRows.length].id;
    const matId = materialRows[(i - 1) % materialRows.length].id;
    const rcptStatus = receiptStatuses[i % receiptStatuses.length];
    const rcptDate = new Date(now.getTime() - (42 - i) * 5 * 86400000).toISOString().slice(0, 10);
    const qty = 8 + i;

    receiptRows.push({
      id: rcptId,
      receipt_number: `MRR-2025-${String(i).padStart(4, "0")}`,
      purchase_order_item_id: poItem.id,
      material_id: matId,
      supplier_id: supId,
      received_quantity: qty,
      unit: materialRows[(i - 1) % materialRows.length].unit,
      received_at: rcptDate + "T10:30:00Z",
      heat_number: `HT-JSPL-2025-${String(100 + i)}`,
      batch_number: `BATCH-${String(500 + i)}`,
      status: rcptStatus,
      received_by: defaultUserId,
    });

    const isPassed = rcptStatus !== "rejected";
    incomingRows.push({
      id: uuid(`incoming-${i}`),
      inspection_number: `INSP-IN-${String(i).padStart(4, "0")}`,
      material_receipt_id: rcptId,
      inspection_date: rcptDate,
      result: rcptStatus === "pending_inspection" ? "pending" : isPassed ? "accepted" : "rejected",
      observations: isPassed ? "MTC verified against heat stamp. Dimensions within mill tolerance." : "Surface pitting and thickness deviation > 1.2mm detected.",
      inspected_quantity: qty,
      accepted_quantity: isPassed ? qty : 0,
      rejected_quantity: isPassed ? 0 : qty,
      inspector_id: defaultUserId,
      remarks: isPassed ? "Passed incoming chemical & physical verification" : "Non-conformance tagged. Quarantine rack 4.",
    });
  }
  const { error: rcptErr } = await supabase.from("material_receipts").upsert(receiptRows, { onConflict: "id" });
  console.log("Material Receipts inserted:", receiptRows.length, rcptErr ? rcptErr.message : "OK");
  const { error: incErr } = await supabase.from("incoming_inspections").upsert(incomingRows, { onConflict: "id" });
  console.log("Incoming Inspections inserted:", incomingRows.length, incErr ? incErr.message : "OK");

  // 11. Production Jobs & Stages
  const jobRows = [];
  const stageRows = [];
  const jobStatuses = ["planned", "released", "in_progress", "in_progress", "completed", "completed"];
  const stageNames = ["Raw Material Cutting & Edge Prep", "Fit-up & Tack Welding", "Submerged Arc Full Penetration Welding", "Post-Weld Heat Treatment (PWHT)", "Heavy CNC Milling & Boring", "Final Shot Blasting & Primer Application"];

  for (let i = 1; i <= 50; i++) {
    const jobId = uuid(`job-${i}`);
    const prjId = projectRows[(i - 1) % projectRows.length].id;
    const status = jobStatuses[i % jobStatuses.length];
    const qty = (i % 10) + 5;
    const startDate = new Date(now.getTime() - (50 - i) * 6 * 86400000).toISOString();
    const endDate = status === "completed" ? new Date(now.getTime() - (10 - (i % 8)) * 86400000).toISOString() : null;
    const rejectedQty = i % 7 === 0 ? 1 : 0;
    const completedQty = status === "completed" ? qty - rejectedQty : Math.floor((qty - rejectedQty) * 0.5);

    jobRows.push({
      id: jobId,
      job_number: `JOB-2025-${String(i).padStart(4, "0")}`,
      project_id: prjId,
      status,
      quantity: qty,
      completed_quantity: completedQty,
      rejected_quantity: rejectedQty,
      planned_start_at: startDate,
      planned_end_at: new Date(now.getTime() + 15 * 86400000).toISOString(),
      actual_start_at: status !== "planned" ? startDate : null,
      actual_end_at: endDate,
      supervisor_id: defaultUserId,
    });

    // 3 stages per job
    for (let s = 1; s <= 3; s++) {
      const sIndex = ((i - 1) * 3 + s - 1) % stageNames.length;
      stageRows.push({
        id: uuid(`stage-${i}-${s}`),
        production_job_id: jobId,
        stage_sequence: s,
        name: stageNames[sIndex],
        description: `Operational sequence ${s}: ${stageNames[sIndex]} for heavy fabricated section`,
        status: status === "completed" ? "completed" : s === 1 ? "completed" : s === 2 ? "in_progress" : "planned",
        quantity: qty,
        started_at: startDate,
        completed_at: status === "completed" || s === 1 ? endDate || startDate : null,
        operator_id: defaultUserId,
      });
    }
  }
  const { error: jobErr } = await supabase.from("production_jobs").upsert(jobRows, { onConflict: "id" });
  console.log("Production Jobs inserted:", jobRows.length, jobErr ? jobErr.message : "OK");
  const { error: stgErr } = await supabase.from("production_stages").upsert(stageRows, { onConflict: "id" });
  console.log("Production Stages inserted:", stageRows.length, stgErr ? stgErr.message : "OK");

  // 12. Quality Inspections & NCRs & CAPAs
  const qiRows = [];
  const ncrRows = [];
  const capaRows = [];
  const reinspectRows = [];

  for (let i = 1; i <= 60; i++) {
    const qiId = uuid(`qi-${i}`);
    const jobId = jobRows[(i - 1) % jobRows.length].id;
    const stageId = stageRows[(i - 1) % stageRows.length].id;
    const isRejected = i % 5 === 0;
    const inspDate = new Date(now.getTime() - (60 - i) * 4 * 86400000).toISOString().slice(0, 10);

    qiRows.push({
      id: qiId,
      inspection_number: `QA-INSP-${String(i).padStart(4, "0")}`,
      production_job_id: jobId,
      production_stage_id: stageId,
      inspection_date: inspDate,
      result: isRejected ? "rejected" : "accepted",
      observations: isRejected ? "Excessive weld porosity in joint W-04 and weld undercut > 1.5mm" : "Weld profile smooth, Ultrasonic examination 100% acceptable",
      inspector_id: defaultUserId,
      remarks: isRejected ? "Inspection hold applied. Issue NCR." : "All parameters conform to ASME Sec VIII Div 1",
    });

    if (isRejected) {
      const ncrId = uuid(`ncr-${i}`);
      const capaId = uuid(`capa-${i}`);
      ncrRows.push({
        id: ncrId,
        ncr_number: `NCR-2025-${String(ncrRows.length + 1).padStart(4, "0")}`,
        quality_inspection_id: qiId,
        production_job_id: jobId,
        title: `Weld Porosity & Dimensional Deviation in Job ${jobRows[(i - 1) % jobRows.length].job_number}`,
        description: "Root pass porosity discovered during ultrasonic testing. Work held for grind out and reweld.",
        severity: i % 2 === 0 ? "major" : "minor",
        status: i > 30 ? "closed" : "open",
        containment_action: "Quarantined sub-assembly. Marked defect location with yellow dye.",
        disposition: "rework",
        reported_by: defaultUserId,
      });

      capaRows.push({
        id: capaId,
        action_number: `CAPA-${String(capaRows.length + 1).padStart(4, "0")}`,
        ncr_id: ncrId,
        title: "Regulate shielding gas flow rate and re-certify welder",
        description: "Investigation revealed shielding gas hose blockage causing gas turbulence and porosity.",
        root_cause: "Damaged shielding gas flowmeter regulator.",
        corrective_measure: "Replaced flowmeter and ground out defective weld metal.",
        preventive_measure: "Daily pre-shift gas flow calibration checklist implemented.",
        status: i > 30 ? "verified" : "in_progress",
        owner_id: defaultUserId,
        due_date: new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10),
      });

      reinspectRows.push({
        id: uuid(`reinspect-${i}`),
        reinspection_number: `REIN-${String(reinspectRows.length + 1).padStart(4, "0")}`,
        ncr_id: ncrId,
        corrective_action_id: capaId,
        inspection_date: inspDate,
        result: i > 30 ? "accepted" : "pending",
        observations: i > 30 ? "Rework completed. 100% RT examination clear of defects." : "Awaiting final grind finish",
        inspector_id: defaultUserId,
        remarks: i > 30 ? "NCR closed based on acceptable reinspection." : "Pending final test",
      });
    }
  }
  const { error: qiErr } = await supabase.from("quality_inspections").upsert(qiRows, { onConflict: "id" });
  console.log("Quality Inspections inserted:", qiRows.length, qiErr ? qiErr.message : "OK");
  const { error: ncrErr } = await supabase.from("non_conformance_reports").upsert(ncrRows, { onConflict: "id" });
  console.log("NCRs inserted:", ncrRows.length, ncrErr ? ncrErr.message : "OK");
  const { error: capaErr } = await supabase.from("corrective_actions").upsert(capaRows, { onConflict: "id" });
  console.log("CAPAs inserted:", capaRows.length, capaErr ? capaErr.message : "OK");
  const { error: reinErr } = await supabase.from("reinspection_records").upsert(reinspectRows, { onConflict: "id" });
  console.log("Reinspections inserted:", reinspectRows.length, reinErr ? reinErr.message : "OK");

  // 13. Final Inspections & Dispatches
  const finalRows = [];
  const dispatchRows = [];
  for (let i = 1; i <= 35; i++) {
    const finId = uuid(`fin-${i}`);
    const jobId = jobRows[(i - 1) % jobRows.length].id;
    const oId = orderRows[(i - 1) % orderRows.length].id;
    const isAccepted = i % 4 !== 0;
    const finDate = new Date(now.getTime() - (40 - i) * 5 * 86400000).toISOString().slice(0, 10);
    const qty = 5 + (i % 10);

    finalRows.push({
      id: finId,
      inspection_number: `FIN-INSP-${String(i).padStart(4, "0")}`,
      production_job_id: jobId,
      result: isAccepted ? "accepted" : "pending",
      inspection_date: finDate,
      certificate_number: isAccepted ? `COC-JSPL-${2025}-${String(100 + i)}` : null,
      observations: isAccepted ? "All functional dimensions, pressure tests, and coating DFT within approved client tolerances." : "Pending client third-party inspection signoff",
      inspected_quantity: qty,
      accepted_quantity: isAccepted ? qty : 0,
      rejected_quantity: 0,
      inspector_id: defaultUserId,
    });

    if (isAccepted && i <= 25) {
      const dispStatus = i > 12 ? "delivered" : i > 5 ? "dispatched" : "packed";
      dispatchRows.push({
        id: uuid(`disp-${i}`),
        dispatch_number: `DISP-JSPL-${String(i).padStart(4, "0")}`,
        order_id: oId,
        final_inspection_id: finId,
        status: dispStatus,
        quantity: qty,
        dispatch_date: finDate,
        vehicle_number: `CG-04-MB-${1000 + i}`,
        lr_number: `LR-JSPL-${String(2000 + i)}`,
        destination: customerRows[(i - 1) % customerRows.length].shipping_address,
        dispatched_by: defaultUserId,
      });
    }
  }
  const { error: finErr } = await supabase.from("final_inspections").upsert(finalRows, { onConflict: "id" });
  console.log("Final Inspections inserted:", finalRows.length, finErr ? finErr.message : "OK");
  const { error: dispErr } = await supabase.from("dispatches").upsert(dispatchRows, { onConflict: "id" });
  console.log("Dispatches inserted:", dispatchRows.length, dispErr ? dispErr.message : "OK");

  // 14. Workflow History (60 rows for timeline)
  const historyRows = [];
  const stagesList = [
    "order_received", "engineering_review", "project_planning", "procurement",
    "material_receipt", "incoming_inspection", "production", "quality_inspection",
    "final_inspection_dispatch"
  ];
  for (let i = 1; i <= 60; i++) {
    const oId = orderRows[(i - 1) % orderRows.length].id;
    const stage = stagesList[i % stagesList.length];
    const prevStage = stagesList[(i + stagesList.length - 1) % stagesList.length];
    historyRows.push({
      id: uuid(`wf-hist-${i}`),
      workflow_stage: stage,
      entity_type: "orders",
      entity_id: oId,
      from_status: prevStage,
      to_status: stage,
      result: i % 8 === 0 ? "rejected" : "approved",
      remarks: `Manufacturing workflow transition: stage advanced to ${stage.replace(/_/g, " ")}.`,
      performed_by: defaultUserId,
      performed_at: new Date(now.getTime() - (65 - i) * 3 * 86400000).toISOString(),
    });
  }
  const { error: histErr } = await supabase.from("workflow_history").upsert(historyRows, { onConflict: "id" });
  console.log("Workflow History inserted:", historyRows.length, histErr ? histErr.message : "OK");

  console.log("==> All dummy data successfully seeded into Supabase!");
}

run().catch((err) => {
  console.error("FATAL SEED ERROR:", err);
  process.exit(1);
});
