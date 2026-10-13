/** Only X's public image CDN is eligible; never proxy arbitrary destinations. */
export async function GET(req:Request){
 let source:URL;try{source=new URL(new URL(req.url).searchParams.get('url')||'');}catch{return new Response('Invalid image',{status:400});}
 if(source.protocol!=='https:'||source.hostname!=='pbs.twimg.com'||source.port||source.username||source.password||!/^\/(media|profile_images|amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)\/[\w/.-]+$/.test(source.pathname))return new Response('Unsupported image',{status:400});
 try{
  const response=await fetch(source.href,{redirect:'manual',signal:AbortSignal.timeout(15000),cf:{cacheEverything:true,cacheTtl:86400}});
  if(!response.ok){console.warn('Public image upstream',response.status);return new Response('Image unavailable',{status:response.status===404?404:502});}
  const type=response.headers.get('content-type')?.split(';')[0]||'';
  if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(type))return new Response('Unsupported image type',{status:415});
  if(Number(response.headers.get('content-length'))>10*1024*1024)return new Response('Image too large',{status:413});
  const reader=response.body?.getReader();if(!reader)return new Response('Empty image',{status:502});
  const chunks:Uint8Array[]=[];let length=0;
  for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>10*1024*1024){await reader.cancel();return new Response('Image too large',{status:413});}chunks.push(next.value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
 }catch(error){console.warn('Public image fetch failed',error instanceof Error?error.message:'unknown');return new Response('Image unavailable',{status:502});}
}
