// Generate crawlable language pages from the Korean HTML and shared dictionaries.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base='https://rockcandy444.github.io/coffeemarble/';
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const escapeText=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escapeAttr=text=>escapeText(text).replace(/"/g,'&quot;');
for(const locale of ['en','ja']){
 const messages=JSON.parse(fs.readFileSync(path.join(root,'locales',locale+'.js'),'utf8').split('window.MarbleMessages = ')[1].replace(/;\s*$/,''));
 const translate=key=>{if(/[가-힣]/.test(key)&&!Object.hasOwn(messages,key))throw Error('Missing '+locale+' translation: '+key);return messages[key]??key;};
 const protectedBlocks=[];
 let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,block=>'\uE000'+(protectedBlocks.push(block)-1)+'\uE001');
 html=html.split(/(<[^>]*>)/g).map(part=>{
  if(part.startsWith('<'))return part.replace(/(\b(?:aria-label|title|placeholder|content)=)"([^"]*)"/g,(_,attr,value)=>attr+'"'+escapeAttr(translate(value))+'"');
  const key=part.trim();return /[가-힣]/.test(key)?part.replace(key,()=>escapeText(translate(key))):part;
 }).join('').replace(/\uE000(\d+)\uE001/g,(_,i)=>protectedBlocks[+i]);
 html=html.replace('<html lang="ko">','<html lang="'+locale+'">').replace('<head>','<head>\n  <base href="../">');
 html=html.replace('<a class="brand" href="#"','<a class="brand" href="'+locale+'/"');
 html=html.replace(/(<link rel="canonical" href=")[^"]+/, '$1'+base+locale+'/');
 html=html.replace(/(<meta property="og:url" content=")[^"]+/, '$1'+base+locale+'/');
 html=html.replace('content="ko_KR"','content="'+(locale==='en'?'en_US':'ja_JP')+'"');
 html=html.replace(/ aria-current="page"/g,'').replace('data-locale-link="'+locale+'"','data-locale-link="'+locale+'" aria-current="page"');
 html=html.replace(/(<script src="i18n\.js\?v=\d+">)/,'<script src="locales/'+locale+'.js?v=56"></script>\n  $1');
 html=html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(_,open,json,close)=>{
  const data=JSON.parse(json);data['@id']=base+locale+'/#game';data.name=translate('Coffee Marble 커피마블');data.alternateName=locale==='ja'?['Coffee Marble','コーヒーマーブル']:['Coffee Marble'];data.url=base+locale+'/';data.inLanguage=locale;data.description=translate(source.match(/<meta name="description" content="([^"]+)"/)[1]);return open+'\n'+JSON.stringify(data,null,2)+'\n  '+close;
 });
 if(locale==='ja')html=html.replace(/(<link rel="stylesheet" href="styles\.css\?v=\d+">)/,'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&amp;display=swap">\n  $1');
 fs.mkdirSync(path.join(root,locale),{recursive:true});fs.writeFileSync(path.join(root,locale,'index.html'),html);
}
const urls=['', 'en/', 'ja/'];
fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+urls.map(url=>'  <url>\n    <loc>'+base+url+'</loc>\n'+urls.map((other,i)=>'    <xhtml:link rel="alternate" hreflang="'+['ko','en','ja'][i]+'" href="'+base+other+'"/>').join('\n')+'\n    <xhtml:link rel="alternate" hreflang="x-default" href="'+base+'"/>\n  </url>').join('\n')+'\n</urlset>\n');
const runtime=['index.html','i18n.js','app.js','battle.js','beans.js','camera.js','course.js','golden.js','hidden.js','maps.js','roster.js','secret.js','styles.css','favicon.svg','favicon-32.png','apple-touch-icon.png','sitemap.xml','social-preview.png','en/index.html','ja/index.html','locales/en.js','locales/ja.js',...fs.readdirSync(root).filter(f=>/^[a-f0-9]{32}\.txt$/.test(f))];
for(const file of runtime){const dest=path.join(root,'dist',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
console.log('Built Korean, English and Japanese pages; synchronized '+runtime.length+' runtime assets.');
