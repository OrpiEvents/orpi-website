#!/usr/bin/env python3
"""Builds the website's HTML pages from _src/pages/*.html.

Every page shares one <head>, navigation and footer, kept here so a change
to the nav or footer is made once. Run from the repo root:

    python3 _src/build.py

It writes index.html, enquire.html, terms.html, privacy.html and 404.html into the repo root. Vercel serves those files as they are (no build
step on Vercel). Edit the pages in _src/pages, not the generated files.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / '_src' / 'pages'
SITE = 'https://orpi.events'
PORTAL = 'https://book.orpi.events/portal'
WHATSAPP = 'https://wa.me/447424505763?text=Hi%20ORPI%2C%20I%E2%80%99d%20like%20to%20ask%20about%20a%20bar%20for%20my%20event.'
EMAIL = 'hello@orpi.events'
INSTAGRAM = 'https://www.instagram.com/orpi.events/'

# UK company law says a company's website must show its registered name, where
# it's registered, its number and its registered office. This small print at
# the foot of every page is the only place Ilford appears on the site
# (Ruds, 27 Oct 2026); anywhere else a place is needed, say London. The ops
# app keeps the same details in lib/company.js.
LEGAL_LINE = ('ORPI Events Ltd, registered in England and Wales, company&nbsp;no.&nbsp;16506098. '
              'Registered office: Unit 5 Clements Court, Clements Lane, Ilford IG1&nbsp;2QY.')


def paths(svg_file):
    return re.findall(r'<path d="([^"]+)"', (ROOT / 'assets' / 'brand' / svg_file).read_text())


WORD_PATHS = ''.join(f'<path d="{d}"/>' for d in paths('wordmark.svg'))
MONO_PATHS = ''.join(f'<path d="{d}"/>' for d in paths('monogram.svg'))


def wordmark(cls='word', label='ORPI Events'):
    aria = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return f'<svg class="{cls}" viewBox="7 117 411 190" fill="currentColor" {aria}>{WORD_PATHS}</svg>'


def monogram(cls='mono', label=None):
    aria = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return f'<svg class="{cls}" viewBox="7 8 411 411" fill="currentColor" {aria}>{MONO_PATHS}</svg>'


CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>'

NAV_ITEMS = [
    ('packages', '/#packages', 'Packages'),
    ('drinks', '/#drinks', 'Drinks'),
    ('app', '/#app', 'The app'),
    ('reviews', '/#reviews', 'Reviews'),
    ('faq', '/#faq', 'FAQ'),
]


CURRENT = ' aria-current="page"'


def nav(current):
    links = ''.join(
        '<a href="{}"{}>{}</a>'.format(href, CURRENT if key == current else '', text)
        for key, href, text in NAV_ITEMS)
    mobile_links = ''.join(
        '<a href="{}"{}>{}</a>'.format(href, CURRENT if key == current else '', text)
        for key, href, text in [('home', '/', 'Home')] + NAV_ITEMS + [('login', PORTAL, 'Client login')])
    quote_current = CURRENT if current == 'enquire' else ''
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap nav-in">
    <a class="brand" href="/" aria-label="ORPI Events home">{monogram()}{wordmark(label=None)}</a>
    <nav class="nav-links" aria-label="Main">{links}</nav>
    <div class="nav-actions">
      <a class="nav-login" href="{PORTAL}">Client login</a>
      <a class="btn btn-primary btn-sm" href="/enquire"{quote_current} data-nudge>Get a quote</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
        <svg class="open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>
        <svg class="close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav aria-label="Mobile">{mobile_links}</nav>
    <div class="mm-foot">
      <a class="btn btn-primary" href="/enquire">Get a quote</a>
      <a class="btn btn-outline on-dark" href="{WHATSAPP}">{CHAT_ICON}WhatsApp us</a>
      <p>Or email <a href="mailto:{EMAIL}">{EMAIL}</a></p>
    </div>
  </div>
</header>'''


def footer():
    return f'''<footer class="footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="/" aria-label="ORPI Events home" style="color:inherit">{wordmark(label=None)}</a>
      </div>
      <div class="footer-col">
        <h2>Explore</h2>
        <ul>
          <li><a href="/#packages">Packages</a></li>
          <li><a href="/#drinks">Drinks</a></li>
          <li><a href="/#app">The app</a></li>
          <li><a href="/#reviews">Reviews</a></li>
          <li><a href="/#faq">FAQ</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h2>Talk to us</h2>
        <ul>
          <li><a href="/enquire">Get a quote</a></li>
          <li><a href="{WHATSAPP}">WhatsApp +44&nbsp;7424&nbsp;505763</a></li>
          <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
          <li><a href="{INSTAGRAM}">Instagram @orpi.events</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h2>Booked with us?</h2>
        <ul>
          <li><a href="{PORTAL}">Client login</a></li>
          <li><a href="/terms">Terms &amp; conditions</a></li>
          <li><a href="/privacy">Privacy notice</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-base">
      <span><span class="copy">©</span> 2026 ORPI Events Ltd</span>
      <span>Mobile bars across London and England.</span>
    </div>
    <p class="footer-legal">{LEGAL_LINE}</p>
  </div>
</footer>'''


def head(meta):
    title = meta['title']
    desc = meta['description']
    url = SITE + meta['path']
    robots = meta.get('robots', 'index, follow')
    jsonld = meta.get('jsonld', '')
    preload_img = meta.get('preload', '')
    og_title = meta.get('og_title', title)
    css = asset('css/site.css')
    # The 404 page is served at whatever address was mistyped, so it gets no
    # canonical address of its own.
    canonical = f'\n<link rel="canonical" href="{url}">' if meta.get('canonical', True) else ''
    og_url = f'\n<meta property="og:url" content="{url}">' if meta.get('canonical', True) else ''
    return f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">{canonical}
<meta name="theme-color" content="#141115">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ORPI Events">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{desc}">{og_url}
<meta property="og:image" content="{SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/Grift-SemiBold.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/assets/fonts/Grift-Regular.woff" as="font" type="font/woff" crossorigin>{preload_img}
<link rel="stylesheet" href="{css}">
<script>document.documentElement.classList.add('js')</script>{jsonld}
</head>'''


def asset(rel):
    """/assets/<rel>?v=<content hash>. The hash changes whenever the file does,
    so browsers fetch the new CSS or JS straight away even though Vercel tells
    them to keep these files for a year (see vercel.json)."""
    digest = hashlib.sha256((ROOT / 'assets' / rel).read_bytes()).hexdigest()[:10]
    return f'/assets/{rel}?v={digest}'

BUSINESS = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': 'ORPI Events',
    'legalName': 'ORPI Events Ltd',
    'url': SITE,
    'logo': SITE + '/apple-touch-icon.png',
    'image': SITE + '/og.jpg',
    'description': 'Premium mobile bar for weddings, mehndis, sangeets, birthdays and corporate events across London and England.',
    'email': EMAIL,
    'telephone': '+447424505763',
    'foundingDate': '2025-07',
    'address': {'@type': 'PostalAddress', 'addressRegion': 'London', 'addressCountry': 'GB'},
    'areaServed': {'@type': 'AdministrativeArea', 'name': 'England'},
    'sameAs': [INSTAGRAM],
}


def strip_tags(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()


# ── Reviews ──────────────────────────────────────────────────
# Every review on the site is a real client's words, kept in _src/reviews.json.
# A page shows one as <figure data-review="<id>"> with the quote in a
# <blockquote> and the caption in a <figcaption>. The build checks each one, so
# a quote can be shortened but never reworded, and the same words never appear
# twice on a page (Ruds, 29 Oct 2026: reviews placed where they match what
# the visitor is reading, and by the Get a quote buttons).
REVIEWS = json.loads((ROOT / '_src' / 'reviews.json').read_text())


def plain(s):
    """Text without tags, entities or curly quotes, for comparing words."""
    s = strip_tags(s).replace('&amp;', '&').replace('&nbsp;', ' ')
    for a, b in (('’', "'"), ('‘', "'"), ('“', '"'), ('”', '"'), ('—', '-'), ('–', '-')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s).strip()


def sentences(text):
    return [x for x in re.split(r'(?<=[.!?])\s+', plain(text)) if x]


def is_from(review_id, quote):
    review = REVIEWS['reviews'].get(review_id)
    return bool(review) and any(plain(quote) in plain(t) for t in review['text'])


def check_reviews(page, body):
    """The page's review quotes, after checking each against reviews.json."""
    quotes = []
    for attrs, inner in re.findall(r'<figure([^>]*\bdata-review="[^"]*"[^>]*)>(.*?)</figure>', body, re.S):
        rid = re.search(r'data-review="([^"]*)"', attrs).group(1)
        review = REVIEWS['reviews'].get(rid)
        if not review:
            raise SystemExit(f'{page}: there is no review "{rid}" in _src/reviews.json')
        q = re.search(r'<blockquote>(.*?)</blockquote>', inner, re.S)
        quote = plain(q.group(1)) if q else ''
        if not quote or not is_from(rid, quote):
            raise SystemExit(f'{page}: this "{rid}" quote isn\'t word for word from _src/reviews.json:\n  {quote}')
        c = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', inner, re.S)
        caption = plain(c.group(1)) if c else ''
        allowed = list(dict.fromkeys([review['caption'], review.get('short', review['caption'])]))
        if caption not in [plain(a) for a in allowed]:
            raise SystemExit(f'{page}: the "{rid}" review\'s caption should be ' + ' or '.join(f'"{a}"' for a in allowed) + f', not "{caption}"')
        quotes.append(quote)
    said = [s for q in quotes for s in sentences(q)]
    twice = sorted({s for s in said if said.count(s) > 1})
    if twice:
        raise SystemExit(f'{page}: the same review words appear twice on the page:\n  ' + '\n  '.join(twice))
    return said


def nudges(page, said):
    """The short reviews site.js shows by the Get a quote buttons, as a JSON
    block for the page. None of them may repeat a quote already on it."""
    pool = []
    for n in REVIEWS['nudges']:
        review = REVIEWS['reviews'].get(n['review'])
        if not review or not is_from(n['review'], n['quote']):
            raise SystemExit(f'reviews.json: the nudge "{n["quote"]}" isn\'t word for word from review "{n["review"]}"')
        if any(s in said for s in sentences(n['quote'])):
            raise SystemExit(f'{page}: the nudge "{n["quote"]}" is already quoted on the page; pick another')
        pool.append({'q': n['quote'], 'by': review.get('short', review['caption'])})
    data = json.dumps(pool, ensure_ascii=False).replace('</', '<\\/')
    return f'\n<script type="application/json" id="rv-nudges">{data}</script>'


def faq_jsonld(body):
    qa = re.findall(r'<summary>(.*?)<span class="pm".*?</summary>\s*<div class="faq-a">(.*?)</div>', body, re.S)
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [{'@type': 'Question', 'name': strip_tags(q),
                        'acceptedAnswer': {'@type': 'Answer', 'text': strip_tags(a)}} for q, a in qa],
    }


def build():
    for src in sorted(PAGES.glob('*.html')):
        raw = src.read_text()
        m = re.match(r'<!--meta\s+(\{.*?\})\s*-->\s*', raw, re.S)
        if not m:
            raise SystemExit(f'{src.name}: missing <!--meta {{...}} --> header')
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        body = (body.replace('{{WHATSAPP}}', WHATSAPP)
                    .replace('{{EMAIL}}', EMAIL)
                    .replace('{{INSTAGRAM}}', INSTAGRAM)
                    .replace('{{PORTAL}}', PORTAL)
                    .replace('{{CHAT_ICON}}', CHAT_ICON)
                    .replace('{{WORDMARK_HERO}}', wordmark('hero-word', None))
                    .replace('{{WORDMARK}}', wordmark(label=None))
                    .replace('{{MONOGRAM}}', monogram()))
        blocks = []
        if 'business' in meta.get('ld', []):
            blocks.append(BUSINESS)
        if 'faq' in meta.get('ld', []):
            blocks.append(faq_jsonld(body))
        meta['jsonld'] = ''.join(
            '\n<script type="application/ld+json">' + json.dumps(b, ensure_ascii=False).replace('</', '<\\/') + '</script>'
            for b in blocks)
        said = check_reviews(src.name, body)
        scripts = ''.join('\n<script src="{}" defer></script>'.format(asset('js/' + s)) for s in meta.get('scripts', ['site.js']))
        page = (nav(meta.get('nav', '')) + '\n<main id="main">\n' + body.strip() + '\n</main>\n' + footer())
        if 'data-nudge' in page:
            scripts = nudges(src.name, said) + scripts
        html = (head(meta) + '\n<body' + (f' class="{meta["bodyClass"]}"' if meta.get('bodyClass') else '') + '>\n'
                + page + scripts + '\n</body>\n</html>\n')
        out = ROOT / meta.get('out', src.name)
        out.write_text(html)
        print(f'built {out.relative_to(ROOT)} ({len(html) // 1024} KB)')


if __name__ == '__main__':
    build()
