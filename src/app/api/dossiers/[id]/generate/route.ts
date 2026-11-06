import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;const supabase=await createClient();
  const dossier=await supabase.from("quality_dossiers").select("*").eq("id",id).single();
  if(dossier.error||!dossier.data)return NextResponse.json({error:"Dossier not found."},{status:404});
  const jobId=dossier.data.production_job_id;
  const projectRow=await supabase.from("production_jobs").select("projects(order_id)").eq("id",jobId).single();
  const projectLink=projectRow.data as {projects:{order_id:string}|Array<{order_id:string}>}|null;
  const project=Array.isArray(projectLink?.projects)?projectLink.projects[0]:projectLink?.projects;
  const [drawings,certificates,qa,finalInspection,ncr]=await Promise.all([
    supabase.from("engineering_drawings").select("drawing_number,current_revision_id,drawing_revisions(storage_object_path,status)").eq("order_id",(
      project?.order_id
    )),
    supabase.from("material_receipts").select("receipt_number,certificate_storage_path").not("certificate_storage_path","is",null),
    supabase.from("quality_inspections").select("inspection_number,result,report_storage_path,ndt_results").eq("production_job_id",jobId),
    supabase.from("final_inspections").select("inspection_number,result,certificate_storage_path").eq("production_job_id",jobId),
    supabase.from("non_conformance_reports").select("ncr_number,status").eq("production_job_id",jobId),
  ]);
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const page=pdf.addPage([595,842]);
  const lines=[
    `Quality Dossier: ${dossier.data.dossier_number}`,
    `Production Job: ${jobId}`,
    "",
    `Approved engineering drawings: ${(drawings.data??[]).filter((item)=>{
      const revisions=item.drawing_revisions as Array<{status:string}>|{status:string}|null;
      return Array.isArray(revisions)?revisions.some((revision)=>revision.status==="approved"):revisions?.status==="approved";
    }).length}`,
    `Material test certificates: ${certificates.data?.length??0}`,
    `Production QA reports: ${qa.data?.length??0}`,
    `NDT records: ${(qa.data??[]).filter((item)=>item.ndt_results&&Object.keys(item.ndt_results).length>0).length}`,
    `Final inspections: ${finalInspection.data?.length??0}`,
    `NCRs: ${ncr.data?.length??0}`,
    `Closed NCRs: ${(ncr.data??[]).filter((item)=>item.status==="closed").length}`,
    "",
    "This consolidated dossier index does not replace source document approval records.",
  ];
  let y=800;
  for(const line of lines){page.drawText(line,{x:50,y,size:10,font});y-=18;}
  const bytes=await pdf.save();
  const path=`${jobId}/${dossier.data.dossier_number}-${Date.now()}.pdf`;
  const upload=await supabase.storage.from("quality-dossiers").upload(path,new Uint8Array(bytes),{contentType:"application/pdf"});
  if(upload.error)return NextResponse.json({error:upload.error.message},{status:400});
  const {error}=await supabase.from("quality_dossiers").update({status:"complete",pdf_storage_bucket:"quality-dossiers",pdf_storage_path:path,pdf_file_name:`${dossier.data.dossier_number}.pdf`,required_documents:{
    drawings:(drawings.data??[]).length>0,material_certificates:(certificates.data??[]).length>0,
    production_inspections:(qa.data??[]).length>0,final_inspection:(finalInspection.data??[]).some((item)=>item.result==="accepted"),
    ncrs_closed:(ncr.data??[]).every((item)=>item.status==="closed"),
  }}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return new NextResponse(new Blob([bytes as BlobPart]),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${dossier.data.dossier_number}.pdf"`}});
}
