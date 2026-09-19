import { Link } from "../router";

export type SufuJourneyStage="need"|"matched"|"connected"|"doing"|"done";
const stages:[SufuJourneyStage,string,string,string][]=[
 ["need","Need something?","Tell SUFU what you're looking for.","/request"],
 ["matched","Matched","See relevant people, products, jobs and businesses.","/explore"],
 ["connected","Connected","Ask, respond, quote and agree.","/inbox"],
 ["doing","Getting it done","Keep the engagement and payment in one place.","/inbox"],
 ["done","Done","Complete the outcome and build reputation.","/inbox"]
];
export function SufuJourney({stage="need",interactive=true}:{stage?:SufuJourneyStage;interactive?:boolean}){
 const index=stages.findIndex(([id])=>id===stage);
 return <nav aria-label="SUFU journey" className="flex w-full items-center gap-1 overflow-x-auto py-2">
  {stages.map(([id,title,description,to],i)=>{
   const active=i===index,complete=i<index;
   const cls=`group flex min-w-max items-center gap-2 rounded-xl px-2 py-1.5 ${active?"bg-teal-50 text-teal-800":complete?"text-teal-700":"text-slate-400"}`;
   const body=<><span title={description} className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${active||complete?"border-teal-300 bg-teal-50":"border-slate-200 bg-white"}`}>{complete?"✓":i+1}</span><span className="text-xs font-medium">{title}</span></>;
   return <span key={id} className="flex items-center">{interactive&&!active?<Link to={to} className={cls} aria-label={title}>{body}</Link>:<span className={cls} aria-current={active?"step":undefined}>{body}</span>}{i<stages.length-1&&<span className="mx-1 text-slate-300">→</span>}</span>;
  })}
 </nav>;
}
