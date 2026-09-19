export type LocaleCode=string;
export interface TranslationBundle{locale:LocaleCode;direction:"ltr"|"rtl";translations:Record<string,string>;}
const bundles:Record<string,TranslationBundle>={
 en:{locale:"en",direction:"ltr",translations:{"home.need":"Need something?","home.sufu":"Sufu it","home.getDone":"Get it done","nav.home":"Home","nav.explore":"Explore","nav.post":"Post","nav.inbox":"Inbox","nav.profile":"Profile"}},
 sn:{locale:"sn",direction:"ltr",translations:{"home.need":"Pane chaunoda?","home.sufu":"Sufu","home.getDone":"Pedzisa basa","nav.home":"Kumba","nav.explore":"Tsvaga","nav.post":"Isa","nav.inbox":"Mharidzo","nav.profile":"Nhoroondo"}},
 nd:{locale:"nd",direction:"ltr",translations:{"home.need":"Udinga okuthile?","home.sufu":"Sufu","home.getDone":"Qeda umsebenzi","nav.home":"Ikhaya","nav.explore":"Hlola","nav.post":"Faka","nav.inbox":"Imilayezo","nav.profile":"Iphrofayela"}},
 ja:{locale:"ja",direction:"ltr",translations:{"home.need":"何か必要ですか？","home.sufu":"Sufuする","home.getDone":"完了する","nav.home":"ホーム","nav.explore":"探す","nav.post":"投稿","nav.inbox":"受信トレイ","nav.profile":"プロフィール"}},
 zh:{locale:"zh",direction:"ltr",translations:{"home.need":"需要什么？","home.sufu":"Sufu一下","home.getDone":"完成它","nav.home":"首页","nav.explore":"探索","nav.post":"发布","nav.inbox":"收件箱","nav.profile":"个人资料"}}
};
export function getBundle(locale:string):TranslationBundle{return bundles[locale]??bundles.en;}
export function t(locale:string,key:string,fallback?:string){return getBundle(locale).translations[key]??fallback??key;}