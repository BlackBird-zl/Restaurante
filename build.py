import json,re,os,shutil,base64
R='/home/claude/miolo3'
meta=json.load(open(R+'/img/meta.json'))
src=open(R+'/src/template.html',encoding='utf-8').read()
def srcset(k,ext): return ', '.join(f'img/{k}-{w}.{ext} {w}w' for w in sorted(meta[k]['sizes']))
def pic(m):
    parts=[x.strip() for x in m.group(1).split('|')]
    k=parts[0]; o={'eager':False}
    for x in parts[1:]:
        if x=='eager': o['eager']=True
        elif '=' in x: a,b=x.split('=',1); o[a.strip()]=b.strip()
    sizes=o.get('sizes','100vw'); mk=meta[k]; out='<picture>'
    if 'mobile' in o:
        mm=o['mobile']
        out+=f'<source media="(max-width:900px)" type="image/avif" srcset="{srcset(mm,"avif")}" sizes="100vw"><source media="(max-width:900px)" type="image/webp" srcset="{srcset(mm,"webp")}" sizes="100vw">'
    out+=f'<source type="image/avif" srcset="{srcset(k,"avif")}" sizes="{sizes}">'
    cls=f' class="{o["class"]}"' if 'class' in o else ''
    load=' fetchpriority="high"' if o['eager'] else ' loading="lazy"'
    out+=f'<img{cls} src="img/{k}-{mk["w"]}.webp" srcset="{srcset(k,"webp")}" sizes="{sizes}" width="{mk["w"]}" height="{mk["h"]}" alt="{o.get("alt","")}"{load} decoding="async"></picture>'
    return out
page=re.sub(r'\{\{PIC (.*?)\}\}',pic,src)
# preload critical hero image (desktop + mobile)
pre=('<link rel="preload" as="image" type="image/avif" media="(min-width:901px)" imagesrcset="'+srcset('hero','avif')+'" imagesizes="100vw">\n'
     '<link rel="preload" as="image" type="image/avif" media="(max-width:900px)" imagesrcset="'+srcset('hero-m','avif')+'" imagesizes="100vw">\n')
page=page.replace('<link rel="preconnect" href="https://fonts.googleapis.com">',pre+'<link rel="preconnect" href="https://fonts.googleapis.com">',1)
assert '{{' not in page
open(R+'/index.html','w',encoding='utf-8').write(page)
# files used
used=sorted(set(re.findall(r'img/([\w-]+\.(?:webp|avif))',page)))
# JS-built names
for k in ['estudio','janela','balcao','noite']:
    for w in (750,1254): used.append(f'sc-{k}-{w}.webp')
for z in ['pao','maionese','alface','cheddar','carne','base']: used.append(f'lupa-{z}-800.webp')
used.append('lupa-tomate-700.webp'); used=sorted(set(used))
missing=[u for u in used if not os.path.exists(R+'/img/'+u)]
print('used',len(used),'missing',missing)
# standalone package
head='<!DOCTYPE html>\n<html lang="pt-PT">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
i=page.index('</style>')+len('</style>')
sa=head+page[:i]+'\n</head>\n<body>\n'+page[i:].lstrip()+'\n</body>\n</html>\n'
out=R+'/out/miolo-site'; shutil.rmtree(R+'/out',ignore_errors=True); os.makedirs(out+'/img')
open(out+'/index.html','w',encoding='utf-8').write(sa)
for u in used: shutil.copy(R+'/img/'+u,out+'/img/'+u)
shutil.copytree(R+'/src',out+'/src')
shutil.copy(R+'/build.py',out+'/build.py')
json.dump(meta,open(out+'/img/meta.json','w'))
# single file: drop <source>, srcset, preload; embed largest webp only
single=re.sub(r'<source [^>]*>','',sa)
single=re.sub(r' srcset="[^"]*"','',single); single=re.sub(r'<link rel="preload"[^>]*>\n','',single)
b64=lambda f:'data:image/webp;base64,'+base64.b64encode(open(R+'/img/'+f,'rb').read()).decode()
# JS: scenes & lupa dynamic names
single=single.replace("const SRCSET = k => `img/sc-${k}-750.webp 750w, img/sc-${k}-1254.webp 1254w`;","const SRCSET = k => IMG['sc-'+k+'-1254.webp']+' 1254w';")
single=single.replace("im.src='img/sc-'+s.k+'-1254.webp'","im.src=IMG['sc-'+s.k+'-1254.webp']").replace("back.src='img/sc-'+s.k+'-1254.webp'","back.src=IMG['sc-'+s.k+'-1254.webp']")
single=single.replace("src='img/lupa-'+l.z+'-'+(l.z==='tomate'?700:800)+'.webp'","src=IMG['lupa-'+l.z+'-'+(l.z==='tomate'?700:800)+'.webp']")
single=single.replace("x.src='img/lupa-'+l.z+'-'+(l.z==='tomate'?700:800)+'.webp'","x.src=IMG['lupa-'+l.z+'-'+(l.z==='tomate'?700:800)+'.webp']")
single=single.replace("'url(img/sc-estudio-1254.webp)'","'url('+IMG['sc-estudio-1254.webp']+')'")
dyn=[u for u in used if u.startswith(('sc-','lupa-')) and u.endswith('.webp') and ('-750' not in u)]
js='const IMG='+json.dumps({u:b64(u) for u in dyn})+';\n'
single=single.replace('<script>\n(function(){','<script>\n'+js+'(function(){',1)
def emb(m):
    f=m.group(1)
    return b64(f)
single=re.sub(r'img/([\w-]+\.webp)(?=["\)])',lambda m: b64(m.group(1)),single.split('const IMG=')[0])+('const IMG='+single.split('const IMG=',1)[1] if 'const IMG=' in single else '')
# the IMG object's lupa data-src etc. after split: handle remaining refs in the script part
tail=single.split('const IMG=',1)
if len(tail)>1:
    body=tail[1]
    obj,rest=body.split(';\n',1)
    rest=re.sub(r"img/([\w-]+\.webp)",lambda m: b64(m.group(1)),rest)
    single=tail[0]+'const IMG='+obj+';\n'+rest
open(R+'/out/Miolo_v2-1_ficheiro_unico.html','w',encoding='utf-8').write(single)
print('single MB',round(len(single)/1e6,2),'left refs',len(re.findall(r"img/[\w-]+\.(webp|avif)",single)))
