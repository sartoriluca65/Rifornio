// Rifornio: proxy dei dataset giornalieri MIMIT. Da distribuire come Worker separato.
// Nessuna chiave Gemini necessaria per i prezzi carburante.
const SOURCES = {
  stations: 'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv',
  prices: 'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv'
};
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900','access-control-allow-origin':'https://sartoriluca65.github.io'};
const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
const lines = text => text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
function rows(text) {
  const all=lines(text);
  const headerIndex=all.findIndex(line=>/^idimpianto\|/i.test(line));
  if(headerIndex<0)throw Error('Formato ministeriale non riconosciuto');
  const names=all[headerIndex].split('|').map(x=>x.trim().toLowerCase());
  return all.slice(headerIndex+1).map(line=>{const fields=line.split('|');return Object.fromEntries(names.map((n,i)=>[n,(fields[i]||'').trim()]));});
}
function km(a,b,c,d){const rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));}
export default {
 async fetch(request){
  const u=new URL(request.url);
  if(u.pathname!=='/api/stations'||request.method!=='GET')return reply({error:'Endpoint non disponibile'},404);
  const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35||lat>48||lng<6||lng>19)return reply({error:'Coordinate italiane non valide'},400);
  try{
   const results=await Promise.all(Object.values(SOURCES).map(async url=>{
     const res=await fetch(url,{cf:{cacheEverything:true,cacheTtl:3600}});
     if(!res.ok)throw Error('Fonte ministeriale temporaneamente non disponibile');
     return res.text();
   }));
   const stations=rows(results[0]),prices=rows(results[1]),byId=new Map();
   for(const row of stations){
    const a=Number(row.latitudine),b=Number(row.longitudine);
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<35||a>48||b<6||b>19||km(lat,lng,a,b)>25)continue;
    byId.set(row.idimpianto,{id:row.idimpianto,name:row['nome impianto']||row.bandiera||'Distributore',brand:row.bandiera||'',address:[row.indirizzo,row.comune,row.provincia].filter(Boolean).join(', '),lat:a,lng:b,prices:{},updated:null,kind:'Distributore',availability:''});
   }
   const mapping={'benzina':'Benzina','gasolio':'Gasolio','gpl':'GPL','metano':'Metano'};
   for(const row of prices){
    const station=byId.get(row.idimpianto),fuel=mapping[(row.desccarburante||'').toLowerCase()],value=Number(row.prezzo);
    if(!station||!fuel||!Number.isFinite(value)||value<=0||value>5)continue;
    // Prefer self-service when both modes exist.
    if(station.prices[fuel]===undefined||row.isself==='1'){
      station.prices[fuel]=value;
      station.updated=row.dtcomu||station.updated;
    }
   }
   const data=[...byId.values()].filter(s=>Object.keys(s.prices).length).sort((a,b)=>km(lat,lng,a.lat,a.lng)-km(lat,lng,b.lat,b.lng)).slice(0,100);
   return reply({source:'MIMIT – Osservaprezzi carburanti',sourceUrl:'https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti',note:'Dataset quotidiano, non prezzi in tempo reale; coordinate fornite dai gestori.',stations:data,loadedAt:new Date().toISOString()});
  }catch(e){return reply({error:'Dati ufficiali non disponibili; nessun prezzo dimostrativo sostituito.',detail:String(e.message||e)},503);}
 }
};
