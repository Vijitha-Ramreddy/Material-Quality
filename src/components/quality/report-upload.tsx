"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function InspectionReportUpload({inspectionId,fileName}:{inspectionId:string;fileName?:string|null}) {
  const router=useRouter(); const [error,setError]=useState("");
  async function upload(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response=await fetch(`/api/quality/in-process/${inspectionId}/report`,{method:"POST",body:new FormData(event.currentTarget)});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to upload report.");
    setError("");router.refresh();
  }
  return <form onSubmit={upload} className="flex flex-wrap items-center gap-2">
    {error&&<span className="text-xs text-red-700">{error}</span>}
    <input type="file" name="report" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" required className="text-xs"/>
    <button className="text-xs font-medium text-orange-700">{fileName?"Replace report":"Upload report"}</button>
  </form>;
}
