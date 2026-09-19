/* SUFU shared domain types. Global geography is canonical; city/suburb remain compatibility fields during migration. */
export type ListingType = "service" | "product" | "job";
export type Group = "services" | "marketplace" | "jobs" | "businesses";
export type VerificationId = "phone" | "email" | "identity" | "business";
export type SortKey = "newest" | "price-asc" | "price-desc" | "rating";
export type GeographyRole = "origin" | "target" | "supply" | "service_area" | "fulfilment" | "workplace";
export interface Location { city:string; suburb:string; countryCode?:string; regionName?:string; district?:string; locality?:string; neighbourhood?:string; }
export interface GlobalLocationRef { countryCode:string; city?:string; regionCode?:string; district?:string; locality?:string; neighbourhood?:string; latitude?:number; longitude?:number; radiusKm?:number; privacy?:"exact"|"approximate"|"area"; }
export interface EconomicGeography { origin?:GlobalLocationRef; target?:GlobalLocationRef; supply?:GlobalLocationRef; serviceArea?:GlobalLocationRef; fulfilment?:GlobalLocationRef; workplace?:GlobalLocationRef; }
export interface Provider { id:string; name:string; isBusiness:boolean; category:string; tagline:string; bio:string; rating:number; reviewCount:number; completedJobs:number; responseTime:string; location:Location; memberSince:string; languages:string[]; verified:VerificationId[]; services:ProviderService[]; portfolio:PortfolioItem[]; reviews:Review[]; hours?:string; employees?:string; geography?:EconomicGeography; }
export interface ProviderService { name:string; priceFrom:number; }
export interface Review { author:string; rating:number; date:string; text:string; }
export interface PortfolioItem { title:string; kind:string; }
export interface Listing { id:string; type:ListingType; title:string; category:string; description:string; price?:number; salaryLabel?:string; condition?:string; employmentType?:string; remote?:boolean; location:Location; providerId:string; postedAt:string; views:number; tags:string[]; featured?:boolean; coverImageUrl?:string; geography?:EconomicGeography; }
export const categoryGroups:{id:Group;label:string}[]=[{id:"services",label:"Services"},{id:"marketplace",label:"Marketplace"},{id:"jobs",label:"Jobs"},{id:"businesses",label:"Businesses"}];
export const formatUSD=(n:number)=>"$"+n.toLocaleString("en-US");
export function timeAgo(iso:string):string { const seconds=Math.floor((Date.now()-new Date(iso).getTime())/1000); if(seconds<60)return "just now"; const minutes=Math.floor(seconds/60); if(minutes<60)return minutes+"m ago"; const hours=Math.floor(minutes/60); if(hours<24)return hours+"h ago"; const days=Math.floor(hours/24); if(days<7)return days+"d ago"; const weeks=Math.floor(days/7); if(weeks<5)return weeks+"w ago"; const months=Math.floor(days/30); if(months<12)return months+"mo ago"; return Math.floor(days/365)+"y ago"; }
export interface ExploreFilters { q?:string; group?:Group|"all"; country?:string; targetCity?:string; city?:string; suburb?:string; sort?:SortKey; }