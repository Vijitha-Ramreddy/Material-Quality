"use client";

import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";

export function CertificateUpload({id,fileName}:{id:string;fileName?:string|null}) {
  const router=useRouter();const [error,setError]=useState("");
  async function upload(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const response=await fetch(`/api/final-inspection/${id}/certificate`,{method:"POST",body:new FormData(event.currentTarget)});
    const body=await response.json();if(!response.ok)return setError(body.error??"Unable to upload certificate.");
    router.refresh();
  }
  return <form onSubmit={upload} className="flex items-center gap-2">{error&&<span className="text-xs text-red-700">{error}</span>}<input type="file" name="certificate" required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="text-xs"/><button className="text-xs font-medium text-orange-700">{fileName?"Replace":"Upload"}</button></form>;
}
