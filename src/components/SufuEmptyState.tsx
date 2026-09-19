export function SufuEmptyState({query,onSufu}:{query:string;onSufu?:()=>void}){
 return <div className="rounded-[28px] border border-black/5 bg-[#fffdf7] p-8 text-center">
  <p className="text-sm font-medium text-slate-500">Nothing useful yet</p>
  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sufu it another way.</h2>
  <p className="mx-auto mt-2 max-w-md text-slate-600">Try a broader need, a different location, or post the need so someone can respond.</p>
  <button type="button" onClick={onSufu} className="mt-5 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Sufu this need</button>
  <p className="mt-3 text-xs text-slate-400">“{query}”</p>
 </div>;
}
