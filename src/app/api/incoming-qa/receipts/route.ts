import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin","stores"]);
  if (auth.status !== 200) return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const form=await request.formData();
  const quantity=Number(form.get("received_quantity"));
  if (!Number.isFinite(quantity)||quantity<=0) return NextResponse.json({error:"Received quantity must be greater than zero."},{status:400});
  const poItemId=String(form.get("purchase_order_item_id"));
  const certificate=form.get("certificate");
  const supabase=await createClient();
  const {data:item,error:itemError}=await supabase.from("purchase_order_items").select("unit,purchase_orders(supplier_id)").eq("id",poItemId).single();
  if(itemError||!item) return NextResponse.json({error:"Purchase order item not found."},{status:400});
  const purchaseOrders = item.purchase_orders as unknown as {supplier_id:string}|Array<{supplier_id:string}>|null;
  const supplierId = Array.isArray(purchaseOrders) ? purchaseOrders[0]?.supplier_id : purchaseOrders?.supplier_id;
  if(!supplierId) return NextResponse.json({error:"Purchase order supplier could not be resolved."},{status:400});
  const year=new Date().getUTCFullYear();
  const {count}=await supabase.from("material_receipts").select("id",{count:"exact",head:true});
  const receiptNumber=`MR-${year}-${String((count??0)+1).padStart(4,"0")}`;
  let certificatePath:string|null=null;
  if(certificate instanceof File&&certificate.size>0) {
    certificatePath=`${receiptNumber}/${Date.now()}-${certificate.name}`;
    const upload=await supabase.storage.from("material-certificates").upload(certificatePath,certificate,{contentType:certificate.type||"application/octet-stream"});
    if(upload.error)return NextResponse.json({error:upload.error.message},{status:400});
  }
  const {data,error}=await supabase.from("material_receipts").insert({
    receipt_number:receiptNumber,purchase_order_item_id:poItemId,
    supplier_id:supplierId,material_id:form.get("material_id")||null,
    received_quantity:quantity,unit:form.get("unit")||item.unit,heat_number:String(form.get("heat_number")||"").trim()||null,
    batch_number:String(form.get("batch_number")||"").trim()||null,status:"pending_inspection",
    received_by:auth.user.id,specification_checked:false,
    steel_grade:String(form.get("steel_grade")||"").trim()||null,
    material_standard:String(form.get("material_standard")||"").trim()||null,
    thickness_mm:form.get("thickness_mm") ? Number(form.get("thickness_mm")) : null,
    width_mm:form.get("width_mm") ? Number(form.get("width_mm")) : null,
    length_mm:form.get("length_mm") ? Number(form.get("length_mm")) : null,
    weight_kg:form.get("weight_kg") ? Number(form.get("weight_kg")) : null,
    material_description:String(form.get("material_description")||"").trim()||null,
    section_size:String(form.get("section_size")||"").trim()||null,
    dimensions:String(form.get("dimensions")||"").trim()||null,
    certificate_storage_bucket:certificatePath?"material-certificates":null,
    certificate_storage_path:certificatePath,
    certificate_file_name:certificate instanceof File&&certificate.size?certificate.name:null,
  }).select("id").single();
  if(error){if(certificatePath)await supabase.storage.from("material-certificates").remove([certificatePath]);return NextResponse.json({error:error.message},{status:400});}
  const mtcNumber=String(form.get("mtc_number")||"").trim();
  if(mtcNumber) {
    const {error:mtcError}=await supabase.from("material_test_certificates").insert({
      mtc_number:mtcNumber,supplier_id:supplierId,material_receipt_id:data.id,
      heat_number:String(form.get("heat_number")||"").trim(),
      steel_grade:String(form.get("steel_grade")||"").trim()||null,
      material_standard:String(form.get("material_standard")||"").trim()||null,
      storage_bucket:certificatePath?"material-certificates":null,storage_path:certificatePath,
      file_name:certificate instanceof File&&certificate.size>0?certificate.name:null,
      issued_by:String(form.get("mtc_issued_by")||"").trim()||null,
      issued_on:form.get("mtc_issued_on")?String(form.get("mtc_issued_on")):null,
      certificate_status:"pending",
    });
    if(mtcError) return NextResponse.json({error:`Receipt recorded, but MTC could not be saved: ${mtcError.message}`},{status:400});
  }
  return NextResponse.json({id:data.id,receipt_number:receiptNumber},{status:201});
}
