import { useState } from "react";
import { SUFU_LANGUAGE } from "../lib/sufuLanguage";

export function SufuSearchHero({onSearch}:{onSearch?:(value:string)=>void}){
 const [value,setValue]=useState("");
 const submit=()=>{const v=value.trim();if(v)onSearch?.(v);};
 return <section className="rounded-[28px] border border-black/5 bg-[#fffdf7] p-5 shadow-sm">
  <div className="mb-3 text-sm font-medium text-slate-500">SUFU</div>
  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Need something?</h1>
  <p className="mt-2 text-base text-slate-600">{SUFU_LANGUAGE.promise}</p>
  <div className="mt-5 flex gap-2 rounded-2xl border bg-white p-2">
   <input value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} placeholder="What do you need?" className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none"/>
   <button type="button" onClick={submit} className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Sufu it</button>
  </div>
  <div className="mt-4 flex flex-wrap gap-2">{SUFU_LANGUAGE.heroPrompts.slice(0,4).map(p=><button key={p} type="button" onClick={()=>onSearch?.(p.replace(/\? Sufu it\.?$/i,"").replace(/^Need /i,""))} className="rounded-full border px-3 py-2 text-sm text-slate-600">{p}</button>)}</div>
 </section>;
}
