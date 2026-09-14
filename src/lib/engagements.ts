import { supabase } from "./supabase";

export type EngagementStatus = "agreed" | "in_progress" | "completed" | "cancelled" | "disputed";
export interface Engagement {
  id: string; requestId: string; offerId: string; quoteId: string; requesterId: string; providerId: string;
  agreedAmount: number; agreedCurrency: string; agreedTitle: string; agreedScope: string; agreedTerms: string | null;
  status: EngagementStatus; createdAt: string; startedAt: string | null; completedAt: string | null; cancelledAt: string | null;
}
function map(row: Record<string, unknown>): Engagement { return {
  id:String(row.id), requestId:String(row.request_id), offerId:String(row.offer_id), quoteId:String(row.quote_id), requesterId:String(row.requester_id), providerId:String(row.provider_id),
  agreedAmount:Number(row.agreed_amount ?? 0), agreedCurrency:String(row.agreed_currency ?? "USD"), agreedTitle:String(row.agreed_title ?? ""), agreedScope:String(row.agreed_scope ?? ""), agreedTerms:row.agreed_terms == null ? null : String(row.agreed_terms),
  status:String(row.status ?? "agreed") as EngagementStatus, createdAt:String(row.created_at ?? ""), startedAt:row.started_at == null ? null : String(row.started_at), completedAt:row.completed_at == null ? null : String(row.completed_at), cancelledAt:row.cancelled_at == null ? null : String(row.cancelled_at)
}; }
export async function getEngagement(id:string):Promise<Engagement|null>{const {data,error}=await supabase.from("engagements").select("*").eq("id",id).maybeSingle(); return error||!data?null:map(data as Record<string,unknown>);}
export async function engagementsForUser(userId:string):Promise<Engagement[]>{const {data,error}=await supabase.from("engagements").select("*").or(`requester_id.eq.${userId},provider_id.eq.${userId}`).order("created_at",{ascending:false}); return error?[]:(data??[]).map(r=>map(r as Record<string,unknown>));}
export async function updateEngagementStatus(id:string,status:Extract<EngagementStatus,"in_progress"|"completed"|"cancelled"|"disputed">):Promise<{engagement?:Engagement;error?:string}>{const {data,error}=await supabase.rpc("update_engagement_status",{p_engagement_id:id,p_status:status}); if(error)return{error:error.message}; const row=Array.isArray(data)?data[0]:data; return row?.id?{engagement:map(row as Record<string,unknown>)}:{error:"The engagement could not be updated."};}
