#!/usr/bin/env python3
"""Miolo · build estático sem dependências.
Junta cabeçalho/rodapé partilhados às páginas, expande {{PIC ...}} em <picture> (AVIF + WebP + srcset)
e escreve:
  dist/                 site com URLs limpas (/, /o-classico/, /atmosferas/, /carta/, /encomendar/, /casa/)
  dist-artifact/        a mesma coisa com ligações explícitas a index.html (para pré-visualização sem servidor)
Uso: python3 build.py
"""
import json, re, os, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
SITE = 'https://miolo.example'
PAGES = {  # nome: pasta ('' = raiz)
  'home': '', 'classico': 'o-classico', 'atmosferas': 'atmosferas', 'carta': 'carta', 'encomendar': 'encomendar', 'casa': 'casa'}
meta = json.load(open(os.path.join(SRC, 'assets/img/meta.json')))
header = open(os.path.join(SRC, 'partials/header.html'), encoding='utf-8').read()
footer = open(os.path.join(SRC, 'partials/footer.html'), encoding='utf-8').read()
FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=Instrument+Sans:wght@400;500;600&family=Martian+Mono:wght@400;500&display=swap'

def srcset(R, k, ext):
    return ', '.join(f'{R}assets/img/{k}-{w}.{ext} {w}w' for w in sorted(meta[k]['sizes']))

def build(mode):
    out = os.path.join(ROOT, 'dist' if mode == 'site' else 'dist-artifact')
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    shutil.copytree(os.path.join(SRC, 'assets'), os.path.join(out, 'assets'), ignore=shutil.ignore_patterns('meta.json'))
    for name, folder in PAGES.items():
        raw = open(os.path.join(SRC, 'pages', name + '.html'), encoding='utf-8').read()
        m = re.match(r'<!--meta\s*(\{.*?\})\s*-->\s*', raw, re.S); cfg = json.loads(m.group(1)); body = raw[m.end():]
        R = '../' if folder else './'
        def link(p):
            f = PAGES[p]
            if mode == 'site': return (R + f + '/') if f else R
            return (R + f + '/index.html') if f else R + 'index.html'
        def link_art(p):
            f = PAGES[p]
            if f: return R + f + '/index.html'
            return R + 'index.html'
        L = link if mode == 'site' else link_art
        def pic(mm):
            parts = [x.strip() for x in mm.group(1).split('|')]; k = parts[0]; o = {'eager': False}
            for x in parts[1:]:
                if x == 'eager': o['eager'] = True
                elif '=' in x: a, b = x.split('=', 1); o[a.strip()] = b.strip()
            sizes = o.get('sizes', '100vw'); mk = meta[k]; s = '<picture>'
            if 'mobile' in o:
                mo = o['mobile']
                s += f'<source media="(max-width:900px)" type="image/avif" srcset="{srcset(R,mo,"avif")}" sizes="100vw"><source media="(max-width:900px)" type="image/webp" srcset="{srcset(R,mo,"webp")}" sizes="100vw">'
            s += f'<source type="image/avif" srcset="{srcset(R,k,"avif")}" sizes="{sizes}">'
            cls = f' class="{o["class"]}"' if 'class' in o else ''
            load = ' fetchpriority="high"' if o['eager'] else ' loading="lazy"'
            s += f'<img{cls} src="{R}assets/img/{k}-{mk["w"]}.webp" srcset="{srcset(R,k,"webp")}" sizes="{sizes}" width="{mk["w"]}" height="{mk["h"]}" alt="{o.get("alt","")}"{load} decoding="async"></picture>'
            return s
        def fill(t):
            t = re.sub(r'\{\{PIC (.*?)\}\}', pic, t)
            t = re.sub(r'\{\{P:(\w+)\}\}', lambda x: L(x.group(1)), t)
            t = re.sub(r'\{\{CUR:(\w+)\}\}', lambda x: ' aria-current="page"' if x.group(1) == name else '', t)
            t = t.replace('{{R}}', R)
            return t
        pre = ''
        for p in cfg.get('preload', []):
            k, media = p['k'], p.get('media')
            pre += f'<link rel="preload" as="image" type="image/avif"{" media=%s" % chr(34)+media+chr(34) if media else ""} imagesrcset="{srcset(R,k,"avif")}" imagesizes="{p.get("sizes","100vw")}">\n'
        css = ''.join(f'<link rel="stylesheet" href="{R}assets/css/{c}.css">\n' for c in ['miolo'] + cfg.get('css', []))
        js = ''.join(f'<script src="{R}assets/js/{j}.js" defer></script>\n' for j in ['data', 'miolo'] + cfg.get('js', []))
        canon = SITE + '/' + (folder + '/' if folder else '')
        head_inner = (f'<title>{cfg["title"]}</title>\n<meta name="description" content="{cfg["desc"]}">\n'
            f'<link rel="canonical" href="{canon}">\n<meta property="og:title" content="{cfg["title"]}">\n<meta property="og:description" content="{cfg["desc"]}">\n'
            f'<meta property="og:type" content="website">\n<meta property="og:locale" content="pt_PT">\n'
            f'<meta name="theme-color" content="#17120E">\n'
            f'{pre}<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{FONTS}">\n{css}{js}')
        page_body = f'<body data-page="{name}" data-head="{cfg.get("head","light")}">\n' + fill(header) + f'<main id="conteudo">\n{fill(body)}\n</main>\n' + fill(footer) + '</body>\n'
        if mode == 'artifact' and name == 'home':
            # a página principal do artefacto é embrulhada pelo servidor: sem doctype/head próprios
            doc = '<meta charset="utf-8">\n' + head_inner + page_body.replace('<body ', '<div class="bodyattrs" ', 1)
            doc = doc.replace('<div class="bodyattrs" data-page="home" data-head="light">', '<script>(function s(){if(!document.body)return document.addEventListener("DOMContentLoaded",s);document.body.dataset.page="home";document.body.dataset.head="light";})();</script>', 1)
            doc = doc.rsplit('</body>', 1)[0]
        else:
            doc = ('<!DOCTYPE html>\n<html lang="pt-PT">\n<head>\n<meta charset="utf-8">\n'
                   '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head_inner + '</head>\n' + page_body + '</html>\n')
        assert '{{' not in doc, (name, re.findall(r'\{\{[^}]*\}\}', doc)[:3])
        d = os.path.join(out, folder); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(doc)
    if mode == 'site':
        json.dump({"cleanUrls": True, "trailingSlash": True}, open(os.path.join(out, 'vercel.json'), 'w'), indent=2)
    return out

if __name__ == '__main__':
    for m in ('site', 'artifact'): print('built', build(m))
