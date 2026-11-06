"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
export function DossierForm({jobs}:{jobs:Array<{id:string;job_number:string}>}) {
 const router=useRouter();const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const response=await fetch("/api/dossiers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({production_job_id:form.get("production_job_id"),remarks:form.get("remarks")})});const body=await response.json();if(!response.ok)return setError(body.error??"Unable to create dossier.");router.refresh();}
 return <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">{error&&<p className="md:col-span-3 text-sm text-red-700">{error}</p>}<label className="text-sm font-medium">Accepted production job<select name="production_job_id" required className={input}><option value="">Select job</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select></label><label className="text-sm font-medium">Remarks<input name="remarks" className={input}/></label><div className="flex items-end"><Button>Create dossier</Button></div></form>;
}
export function DossierActions({id,status,hasPdf}:{id:string;status:string;hasPdf:boolean}) {
 const router=useRouter();const [error,setError]=useState("");
 async function generate(){const response=await fetch(`/api/dossiers/${id}/generate`,{method:"POST"});if(!response.ok){const body=await response.json();return setError(body.error??"Unable to generate dossier.");}const blob=await response.blob();const url=URL.createObjectURL(blob);window.open(url,"_blank");router.refresh();}
 async function approve(){const response=await fetch(`/api/dossiers/${id}/approve`,{method:"POST"});const body=await response.json();if(!response.ok)return setError(body.error??"Unable to approve dossier.");router.refresh();}
 return <div className="flex flex-wrap items-center gap-2">{error&&<span className="text-xs text-red-700">{error}</span>}<Button variant="secondary" onClick={generate}>{hasPdf?"Regenerate PDF":"Generate PDF"}</Button>{status==="complete"&&<Button onClick={approve}>Approve dossier</Button>}</div>;
}
