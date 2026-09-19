export type SufuJourneyStage="need"|"matched"|"connected"|"doing"|"done";
const stages:[SufuJourneyStage,string,string][]=[
 ["need","Need something?","Tell SUFU what you're looking for."],
 ["matched","Matched","See relevant people, products, jobs and businesses."],
 ["connected","Connected","Ask, respond, quote and agree."],
 ["doing","Getting it done","Keep the engagement and payment in one place."],
 ["done","Done","Complete the outcome and build reputation."]
];
export function SufuJourney({stage="need"}:{stage?:SufuJourneyStage}){
 const index=stages.findIndex(([id])=>id===stage);
 return <div aria-label="SUFU journey" className="flex w-full items-center gap-1 overflow-x-auto py-2">
  {stages.map(([id,title],i)=><div key={id} className={`flex min-w-max items-center gap-2 ${i<=index?"text-teal-700":"text-slate-400"}`}>
   <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${i<=index?"border-teal-300 bg-teal-50":"border-slate-200 bg-white"}`}>{i+1}</span>
   <span className="text-xs font-medium">{title}</span>
   {i<stages.length-1&&<span className="mx-1 text-slate-300">→</span>}
  </div>)}
 </div>;
}
