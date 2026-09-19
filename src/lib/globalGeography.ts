export type GeographyLevel="world"|"country"|"region"|"city"|"district"|"locality"|"neighbourhood";
export interface GeographyNode{id:string;level:Exclude<GeographyLevel,"world">;countryCode:string;name:string;code?:string;parentId?:string;timezone?:string;latitude?:number;longitude?:number;}
export interface LocationSelection{countryCode:string;regionCode?:string;city?:string;district?:string;locality?:string;neighbourhood?:string;latitude?:number;longitude?:number;radiusKm?:number;privacy:"exact"|"approximate"|"area";}
export function locationParts(l:LocationSelection){return [l.neighbourhood,l.locality,l.city,l.regionCode,l.countryCode].filter(Boolean) as string[];}
export function radiusForSearch(l:LocationSelection){return Math.max(1,Math.min(l.radiusKm??25,500));}
