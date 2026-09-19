import { SUFU_LANGUAGE } from "../lib/sufuLanguage";

export function SufuItChips({onSelect}:{onSelect?:(value:string)=>void}){
 const items=SUFU_LANGUAGE.heroPrompts.map(p=>p.replace(/\? Sufu it\.?$/i,"").replace(/^Need /i,""));
 return <div className="flex flex-wrap gap-2">{items.map(item=><button key={item} type="button" onClick={()=>onSelect?.(item)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-teal-300 hover:text-teal-700">{item}</button>)}</div>;
}
