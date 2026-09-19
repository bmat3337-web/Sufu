export type LocaleCode=string;
export interface TranslationBundle{locale:LocaleCode;direction:"ltr"|"rtl";translations:Record<string,string>;}
const bundles:Record<string,TranslationBundle>={
 en:{locale:"en",direction:"ltr",translations:{"home.need":"Need something?","home.sufu":"Sufu it","home.getDone":"Get it done","nav.home":"Home","nav.explore":"Explore","nav.post":"Post","nav.inbox":"Inbox","nav.profile":"Profile"}},
 sn:{locale:"sn",direction:"ltr",translations:{"home.need":"Pane chaunoda?","home.sufu":"Sufu","home.getDone":"Pedzisa basa","nav.home":"Kumba","nav.explore":"Tsvaga","nav.post":"Isa","nav.inbox":"Mharidzo","nav.profile":"Nhoroondo"}},
 nd:{locale:"nd",direction:"ltr",translations:{"home.need":"Udinga okuthile?","home.sufu":"Sufu","home.getDone":"Qeda umsebenzi","nav.home":"Ikhaya","nav.explore":"Hlola","nav.post":"Faka","nav.inbox":"Imilayezo","nav.profile":"Iphrofayela"}}
};
export function getBundle(locale:string):TranslationBundle{return bundles[locale]??bundles.en;}
export function t(locale:string,key:string,fallback?:string){return getBundle(locale).translations[key]??fallback??key;}
