import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { FinalInspectionForm } from "@/components/final-inspection/final-inspection-form";
import { CertificateUpload } from "@/components/final-inspection/certificate-upload";

export default async function Page() {
  const supabase=await createClient();
  const [jobs, inspections, measurements]=await Promise.all([
    supabase.from("production_jobs").select("id,job_number,quantity,status").eq("status","completed").order("created_at",{ascending:false}),
    supabase.from("final_inspections").select("*,production_jobs(job_number,quantity)").order("created_at",{ascending:false}),
    supabase.from("final_inspection_measurements").select("*").order("created_at"),
  ]);
  return <div className="space-y-5"><div><p className="text-sm text-orange-600">Quality assurance</p><h1 className="text-2xl font-semibold text-slate-900">Final inspection and acceptance</h1></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Perform final inspection</h2><FinalInspectionForm jobs={jobs.data??[]}/></Card>
    <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Final inspections</h2></div><div className="divide-y">{(inspections.data??[]).map((inspection)=><div key={inspection.id} className="px-5 py-5">
      <div className="grid gap-3 md:grid-cols-6"><div><p className="font-medium">{inspection.inspection_number}</p><p className="text-xs text-slate-500">{inspection.production_jobs?.job_number}</p></div><p className="capitalize">{inspection.result.replaceAll("_"," ")}</p><p>{inspection.inspected_quantity} inspected</p><p>{inspection.accepted_quantity} accepted</p><p>{inspection.certificate_number??"No certificate number"}</p><CertificateUpload id={inspection.id} fileName={inspection.certificate_file_name}/></div>
      <div className="mt-3 grid gap-2 md:grid-cols-2"><p className="text-sm"><span className="font-medium">Dimensional:</span> {inspection.observations?.dimensional||"-"}</p><p className="text-sm"><span className="font-medium">Functional:</span> {inspection.observations?.functional||"-"}</p></div>
      {(measurements.data??[]).filter((measurement)=>measurement.final_inspection_id===inspection.id).map((measurement)=><p key={measurement.id} className="mt-2 text-xs">{measurement.characteristic}: {measurement.measured_value} {measurement.unit} - <span className={measurement.result==="fail"?"font-semibold text-red-700":"font-semibold text-green-700"}>{measurement.result}</span></p>)}
    </div>)}</div></Card>
  </div>;
}
