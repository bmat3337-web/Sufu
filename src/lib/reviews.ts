import { supabase } from "./supabase";

export interface SufuReview { id:string; engagementId:string; reviewerId:string; revieweeId:string; rating:number; body:string|null; createdAt:string; }
function map(r:Record<string,unknown>):SufuReview{return{id:String(r.id),engagementId:String(r.engagement_id),reviewerId:String(r.reviewer_id),revieweeId:String(r.reviewee_id),rating:Number(r.rating),body:r.body==null?null:String(r.body),createdAt:String(r.created_at)}}
export async function reviewsForUser(userId:string){const {data,error}=await supabase.from("reviews").select("*").eq("reviewee_id",userId).order("created_at",{ascending:false});return error?[]:(data??[]).map(r=>map(r as Record<string,unknown>));}
export async function submitReview(engagementId:string,rating:number,body:string){const {data,error}=await supabase.rpc("submit_review",{p_engagement_id:engagementId,p_rating:rating,p_body:body||null});if(error)return{error:error.message};const row=Array.isArray(data)?data[0]:data;return row?.id?{review:map(row as Record<string,unknown>)}:{error:"The review could not be submitted."};}
