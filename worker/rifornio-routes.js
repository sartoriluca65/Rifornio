// Rifornio Routes - Cloudflare Worker. Chiave esclusivamente in Secret ROUTING_API_KEY.
const ORIGIN='https://sartoriluca65.github.io';
const headers={'content-type':'application/json; charset=utf-8','access-control-allow-origin':ORIGIN,'vary':'Origin','cache-control':'no-store'};
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});
  if(url.pathname==='/health'&&request.method==='GET')return reply({ok:true,service:'rifornio-routes',keyConfigured:!!env.ROUTING_API_KEY});
  if(url.pathname!=='/api/routes'||request.method!=='POST')return reply({error:'Endpoint non disponibile'},404);
  if(request.headers.get('origin')!==ORIGIN)return reply({error:'Origine non autorizzata'},403);
  if(!env.ROUTING_API_KEY)return reply({error:'Chiave percorsi non configurata'},503);
  let data;
  try{data=await request.json()}catch{return reply({error:'JSON non valido'},400)}
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  const from=data?.from, to=data?.to;
  if(!point(from)||!point(to))return reply({error:'Coordinate non valide: usa [longitudine, latitudine]'},400);
  try{
   const upstream=await fetch('https://api.openrouteservice.org/v2/directions/driving-car',{
    method:'POST',
    headers:{'content-type':'application/json','Authorization':env.ROUTING_API_KEY},
    body:JSON.stringify({coordinates:[from,to],instructions:false}),
    signal:AbortSignal.timeout(18000)
   });
   if(!upstream.ok){console.error('Routing upstream HTTP',upstream.status,(await upstream.text()).slice(0,400));return reply({error:upstream.status===429?'Limite richieste percorsi raggiunto':'Servizio percorsi non disponibile'},upstream.status===429?429:502)}
   const result=await upstream.json();
   const summary=result?.routes?.[0]?.summary;
   if(!summary||!Number.isFinite(summary.distance)||!Number.isFinite(summary.duration))return reply({error:'Percorso non disponibile'},502);
   return reply({distanceKm:Math.round(summary.distance/100)/10,durationMin:Math.max(1,Math.round(summary.duration/60)),source:'OpenRouteService',estimated:false});
  }catch(e){console.error('Routing request error',e?.name,e?.message);return reply({error:'Impossibile calcolare il percorso ora'},502)}
 }
};
