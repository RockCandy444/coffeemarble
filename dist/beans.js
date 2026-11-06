(() => {
  'use strict';
  const browserTitle = document.title;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dot=(a,b)=>a.x*b.x+a.y*b.y,sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
  const triple=(a,b,c)=>({x:b.x*dot(a,c)-a.x*dot(b,c),y:b.y*dot(a,c)-a.y*dot(b,c)});
  function ellipseSupport(ball,dx,dy){const a=ball.r,b=ball.bean?ball.r*.72:ball.r,c=Math.cos(ball.angle||0),s=Math.sin(ball.angle||0),x=dx*c+dy*s,y=-dx*s+dy*c,d=Math.hypot(a*x,b*y)||1;return{x:c*a*a*x/d-s*b*b*y/d,y:s*a*a*x/d+c*b*b*y/d};}
  function radius(ball,nx,ny){return dot(ellipseSupport(ball,nx,ny),{x:nx,y:ny});}
  const supportBall=ball=>d=>{const p=ellipseSupport(ball,d.x,d.y);return{x:ball.x+p.x,y:ball.y+p.y};};
  const supportCircle=p=>d=>{const n=Math.hypot(d.x,d.y)||1;return{x:p.x+d.x/n*p.r,y:p.y+d.y/n*p.r};};
  const supportPolygon=points=>d=>points.reduce((a,b)=>dot(a,d)>dot(b,d)?a:b);
  const supportSegment=s=>d=>{const a={x:s.x1,y:s.y1},b={x:s.x2,y:s.y2},p=dot(a,d)>dot(b,d)?a:b,n=Math.hypot(d.x,d.y)||1,r=s.radius??4.5;return{x:p.x+d.x/n*r,y:p.y+d.y/n*r};};
  // GJK/EPA uses the rotated ellipse's exact support function, including moving capsules.
  function contact(sa,sb,initial={x:1,y:0}){
    const support=d=>sub(sa(d),sb({x:-d.x,y:-d.y}));let dir=initial,simplex=[support(dir)];dir={x:-simplex[0].x,y:-simplex[0].y};
    for(let step=0;step<24;step++){
      if(Math.hypot(dir.x,dir.y)<1e-9)dir={x:0,y:1};const a=support(dir);if(dot(a,dir)<-1e-8)return null;simplex.push(a);const ao={x:-a.x,y:-a.y},b=simplex.at(-2),ab=sub(b,a);
      if(simplex.length===2){if(dot(ab,ao)<=0){simplex=[a];dir=ao;}else{dir=triple(ab,ao,ab);if(Math.hypot(dir.x,dir.y)<1e-9)dir={x:-ab.y,y:ab.x};}continue;}
      const c=simplex[0],ac=sub(c,a),ap=triple(ac,ab,ab),cp=triple(ab,ac,ac);
      if(dot(ap,ao)>1e-9){simplex=[b,a];dir=ap;continue;}if(dot(cp,ao)>1e-9){simplex=[c,a];dir=cp;continue;}
      if((simplex[1].x-simplex[0].x)*(simplex[2].y-simplex[0].y)-(simplex[1].y-simplex[0].y)*(simplex[2].x-simplex[0].x)<0)simplex.reverse();
      for(let i=0;i<28;i++){
        let best=null;for(let j=0;j<simplex.length;j++){const p=simplex[j],q=simplex[(j+1)%simplex.length],dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);if(length<1e-9)continue;const n={x:dy/length,y:-dx/length},distance=dot(n,p);if(!best||distance<best.distance)best={n,distance,index:j};}
        if(!best)return null;const p=support(best.n),distance=dot(p,best.n);if(distance-best.distance<.005||i===27)return{nx:-best.n.x,ny:-best.n.y,depth:Math.max(0,distance)};
        simplex.splice(best.index+1,0,p);
      }
    }return null;
  }
  function pinContact(ball,pin){
    if(Math.abs(ball.x-pin.x)>ball.r+pin.r||Math.abs(ball.y-pin.y)>ball.r+pin.r||Math.hypot(ball.x-pin.x,ball.y-pin.y)>=ball.r+pin.r)return null;
    const a=supportBall(ball);if(!pin.star)return contact(a,supportCircle(pin),sub(pin,ball));
    const vertices=window.MarbleCourse.starVertices(pin).map(p=>({x:p.x+pin.x,y:p.y+pin.y}));let best=null;
    // The concave star is a union of ten triangles, so empty notches stay empty.
    for(let i=0;i<10;i++){const result=contact(a,supportPolygon([{x:pin.x,y:pin.y},vertices[i],vertices[(i+1)%10]]),sub(pin,ball));if(result&&(!best||result.depth>best.depth))best=result;}return best;
  }
  function segmentContact(ball,s){if(ball.x+ball.r<Math.min(s.x1,s.x2)-(s.radius||5)||ball.x-ball.r>Math.max(s.x1,s.x2)+(s.radius||5)||ball.y+ball.r<Math.min(s.y1,s.y2)-(s.radius||5)||ball.y-ball.r>Math.max(s.y1,s.y2)+(s.radius||5))return null;return contact(supportBall(ball),supportSegment(s),{x:(s.x1+s.x2)/2-ball.x,y:(s.y1+s.y2)/2-ball.y});}
  function pairContact(a,b){if(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r)return null;return contact(supportBall(a),supportBall(b),sub(b,a));}
  function impact(ball,nx,ny,delta,sx=0,sy=0){if(!ball.bean)return;const arm=ellipseSupport(ball,-nx,-ny),inertia=ball.r*ball.r*(1+.72*.72)/4;ball.spin=(ball.spin||0)+(arm.x*ny-arm.y*nx)*delta/Math.max(1,inertia);const tx=-ny,ty=nx,slip=(ball.vx-sx)*tx+(ball.vy-sy)*ty+(ball.spin||0)*(arm.x*ty-arm.y*tx),friction=clamp(-slip*.004,-12,12);ball.vx+=tx*friction;ball.vy+=ty*friction;ball.spin=clamp(ball.spin+(arm.x*ty-arm.y*tx)*friction/Math.max(1,inertia),-10,10);}
  function tick(ball,dt){if(ball.bean){if(ball.beanRescueY!==undefined&&ball.y>ball.beanRescueY+180){ball.rescueCount=0;delete ball.beanRescueY;}ball.prevAngle=ball.angle||0;ball.spin=(ball.spin||0)*Math.exp(-dt*.5);ball.angle=(ball.angle||0)+ball.spin*dt;}}
  function rescued(ball){if(ball.bean){ball.beanRescueY=ball.y;ball.spin=(ball.id%2?1:-1)*8;}}
  function draw(ctx,ball,selected){
    const r=ball.r;ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.angle||0);ctx.beginPath();ctx.ellipse(1.2,2,r,r*.72,0,0,Math.PI*2);ctx.fillStyle='#2d170b40';ctx.fill();
    const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#bc8a5b');g.addColorStop(.55,ball.golden?'#d6a84b':'#825031');g.addColorStop(1,'#48291d');ctx.beginPath();ctx.ellipse(0,0,r,r*.72,0,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=selected?'#fff2c6':ball.color;ctx.lineWidth=selected?2.5:Math.max(1.4,r*.16);ctx.stroke();
    ctx.save();ctx.clip();ctx.strokeStyle=ball.color;ctx.globalAlpha=.8;ctx.lineWidth=r*.13;
    if(ball.pattern==='stripe'){ctx.beginPath();ctx.moveTo(-r*.6,-r);ctx.lineTo(r*.5,r);ctx.stroke();}if(ball.pattern==='ring'){ctx.beginPath();ctx.ellipse(0,0,r*.75,r*.5,0,0,Math.PI*2);ctx.stroke();}if(ball.pattern==='dots')for(const x of [-.6,0,.6]){ctx.beginPath();ctx.arc(x*r,-r*.32,r*.11,0,Math.PI*2);ctx.fillStyle=ball.color;ctx.fill();}
    ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(-r*.86,0);ctx.bezierCurveTo(-r*.2,-r*.45,r*.15,r*.45,r*.86,0);ctx.strokeStyle='#352018';ctx.lineWidth=Math.max(1,r*.14);ctx.stroke();ctx.restore();ctx.restore();
    ctx.fillStyle='#fff8df';ctx.font='800 '+Math.max(5.5,Math.min(9,r*.82))+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(ball.id),ball.x,ball.y+.3,r*1.5);
  }
  class BeanSwitch{
    constructor({allowed=()=>true,now=()=>performance.now(),change=()=>{}}={}){Object.assign(this,{allowed,now,change});this.enabled=false;this.busy=false;this.count=0;this.last=0;}
    tap(){if(this.busy||this.enabled||!this.allowed())return false;const now=this.now();if(now-this.last>5000)this.count=0;this.last=now;if(++this.count<5)return false;this.count=0;this.busy=true;this.change(true);return true;}
    wipe(){if(this.busy||!this.enabled||!this.allowed())return false;this.busy=true;this.change(false);return true;}
    commit(enabled){this.enabled=enabled;}
    finish(){this.busy=false;this.count=0;}
  }
  let switcher=new BeanSwitch(),stage='setup',config={},observer=null,pending=false;
  const textCache=new WeakMap(),attrCache=new WeakMap();
  function words(text){
    if(!switcher.enabled)return text;
    let result=text;const held=[];
    const hold=value=>{const token='\uE000'+held.length+'\uE001';held.push(value);return token;};
    for(const name of [...new Set(config.names?.()||[])].sort((a,b)=>b.length-a.length)){
      if(!/구슬|marble|ビー玉/i.test(name))continue;
      const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      result=result.replace(new RegExp('(#\\d+\\s+)'+escaped,'g'),(_,prefix)=>prefix+hold(name));
    }
    result=result.replace(/Coffee Marble/g,hold);
    if(window.MarbleI18n?.locale==='en')result=result.replace(/\bmarbles?\b/gi,word=>(word[0]==='M'?'Coffee bean':'coffee bean')+(/s$/i.test(word)?'s':''));
    else if(window.MarbleI18n?.locale==='ja')result=result.replace(/ビー玉/g,'コーヒー豆');
    else result=result.replace(/구슬로/g,'커피콩으로').replace(/구슬/g,'커피콩');
    return result.replace(/\uE000(\d+)\uE001/g,(_,i)=>held[+i]);
  }
  function refresh(){
    pending=false;if(!document.createTreeWalker)return;const walker=document.createTreeWalker(document.body,4);let node;
    while(node=walker.nextNode()){if(node.parentElement?.closest('script,style,textarea,input,.roster-list,.brand'))continue;const old=textCache.get(node),original=old&&node.data===old.shown?old.original:node.data,shown=words(original);textCache.set(node,{original,shown});if(node.data!==shown)node.data=shown;}
    for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))for(const attr of ['aria-label','title','placeholder']){if(el.id==='beanWipe'||!el.hasAttribute(attr))continue;const values=attrCache.get(el)||{},old=values[attr],current=el.getAttribute(attr),original=old&&current===old.shown?old.original:current,shown=words(original);values[attr]={original,shown};attrCache.set(el,values);if(current!==shown)el.setAttribute(attr,shown);}
    document.title=browserTitle||window.MarbleI18n?.t('Coffee Marble 커피마블')||'Coffee Marble 커피마블';
  }
  function queueWords(){if(pending)return;pending=true;queueMicrotask(refresh);}
  function update(){document.body.classList.toggle('bean-mode',switcher.enabled);const wipe=document.querySelector('#beanWipe');if(wipe)wipe.hidden=!switcher.enabled||stage==='race';refresh();}
  function animateMode(enabled){
    const fx=document.querySelector('#beanFx'),wash=document.querySelector('#coffeeDye'),reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(!fx||reduce){switcher.commit(enabled);update();switcher.finish();return;}
    fx.hidden=false;fx.className='bean-fx '+(enabled?'bean-arriving':'bean-cleaning');fx.replaceChildren();wash.hidden=enabled;
    const finish=()=>{fx.hidden=true;fx.replaceChildren();wash.hidden=true;wash.className='coffee-dye';switcher.finish();update();};
    if(enabled){
      const source=document.querySelector('#beanTrigger').getBoundingClientRect(),cup=document.querySelector('.brand-coffee').getBoundingClientRect(),x=source.x+source.width/2,y=source.y+source.height/2,ex=cup.x+cup.width/2,ey=cup.y+cup.height/2;
      const flying=document.createElement('div');flying.className='flying-bean';const svg=document.querySelector('#beanTrigger svg').cloneNode(true);svg.querySelector('defs')?.remove();flying.append(svg);fx.append(flying);
      const arc=Math.max(18,Math.min(90,Math.min(y,ey)-16));const keys=Array.from({length:25},(_,i)=>{const t=i/24;return{transform:'translate('+(x+(ex-x)*t-24)+'px,'+(y+(ey-y)*t-arc*4*t*(1-t)-24)+'px) rotate('+(t*460)+'deg) scale('+(1-t*.65)+')'};});flying.animate(keys,{duration:950,easing:'linear',fill:'forwards'});
      setTimeout(()=>{flying.hidden=true;document.querySelector('.brand-coffee').animate([{transform:'scale(1)'},{transform:'scale(1.3) rotate(-12deg)'},{transform:'scale(1)'}],{duration:400});
        for(let i=0;i<18;i++){const drop=document.createElement('i'),a=i*Math.PI*2/18;drop.className='coffee-drop';drop.style.left=ex+'px';drop.style.top=ey+'px';drop.style.setProperty('--dx',Math.cos(a)*(60+i*9)+'px');drop.style.setProperty('--dy',Math.sin(a)*(55+i*7)+80+'px');fx.append(drop);}
        wash.hidden=false;wash.className='coffee-dye spreading';wash.style.setProperty('--origin',ex+'px '+ey+'px');switcher.commit(true);update();setTimeout(finish,1500);
      },950);
    }else{
      wash.className='coffee-dye wiping';const cloth=document.createElement('div');cloth.className='flying-cloth';cloth.innerHTML=document.querySelector('#beanWipe').innerHTML;fx.append(cloth);
      cloth.animate([{transform:'translate(-80px,10vh) rotate(-25deg)'},{transform:'translate(45vw,50vh) rotate(20deg)'},{transform:'translate(110vw,80vh) rotate(-20deg)'}],{duration:1400,fill:'forwards'});
      for(let i=0;i<16;i++){const sparkle=document.createElement('b');sparkle.className='wipe-sparkle';sparkle.textContent='✧';sparkle.style.left=(5+i*6)%98+'vw';sparkle.style.top=(12+i*23)%85+'vh';sparkle.style.animationDelay=i*.06+'s';fx.append(sparkle);}
      setTimeout(()=>{switcher.commit(false);update();},700);setTimeout(finish,1700);
    }
  }
  function mount(options){config=options;switcher=new BeanSwitch({allowed:()=>config.allowed?.()!==false,change:animateMode});document.querySelector('#beanTrigger')?.addEventListener('click',()=>switcher.tap());document.querySelector('#beanWipe')?.addEventListener('click',()=>switcher.wipe());if(typeof MutationObserver!=='undefined'){observer=new MutationObserver(queueWords);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});}update();}
  window.CoffeeBeans={BeanSwitch,ellipseSupport,radius,pinContact,segmentContact,pairContact,impact,tick,rescued,draw,words,mount,refresh,restoreMode(enabled){switcher.commit(!!enabled);update();},setStage(next){stage=next;update();},get enabled(){return switcher.enabled;},get busy(){return switcher.busy;}};
})();
