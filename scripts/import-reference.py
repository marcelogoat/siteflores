import argparse
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--reference', type=Path, required=True)
parser.add_argument('--shared', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
source = args.reference
shared = args.shared


def save(path, content):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def css(text):
    return re.sub(r'/\*[\s\S]*?\*/', '', text).strip()


catalog = json.loads((source / 'data_catalog.json').read_text(encoding='utf-8'))
for product in catalog:
    product['image'] = urlsplit(product['image']).path
save('src/data/catalog.json', json.dumps(catalog, ensure_ascii=False, indent=2))
save('src/data/collections.json', (source / 'data_collections.json').read_text(encoding='utf-8'))
save('src/styles/reference.css', css((shared / 'rosa-main.css').read_text(encoding='utf-8')))
ui = (shared / 'rosa-ui.js').read_text(encoding='utf-8')
icons = dict(re.findall(r"^  (\w+): '(<svg[^\n]+</svg>)',?$", ui, re.M))
icons['logo'] = re.search(r'export const LOGO_MARK = `([\s\S]*?)`;', ui).group(1).strip()
save('src/data/icons.json', json.dumps(icons, ensure_ascii=False, indent=2))
pages = {'home': (shared / 'rosa-home.html').read_text(encoding='utf-8')}
for file in source.glob('*.html'):
    pages[file.stem] = file.read_text(encoding='utf-8')
tracking = shared / 'rosa-reference.html'
if tracking.exists():
    pages['acompanhar'] = tracking.read_text(encoding='utf-8')
for name, html in pages.items():
    save(f'src/styles/pages/{name}.css', css('\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>', html))))


class CleanContent(HTMLParser):
    allowed = {'main', 'section', 'article', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'a', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'br', 'hr', 'details', 'summary', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'svg', 'path', 'circle', 'rect'}
    attrs = {'class', 'id', 'href', 'aria-label', 'aria-hidden', 'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx'}

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []

    def handle_starttag(self, tag, attrs):
        if tag not in self.allowed:
            return
        clean = []
        for key, value in attrs:
            if key not in self.attrs or value is None:
                continue
            if key == 'href':
                if value.startswith('mailto:'):
                    value = '/atendimento?sem_pedido=1'
                elif not value.startswith(('/', '#')) or value.startswith('//'):
                    value = '/contato'
                value = value.replace('.html', '')
            key = 'viewBox' if key == 'viewbox' else key
            clean.append(f'{key}="{value.replace(chr(34), "&quot;")}"')
        self.output.append(f'<{tag}{" " if clean else ""}{" ".join(clean)}>')

    def handle_endtag(self, tag):
        if tag in self.allowed:
            self.output.append(f'</{tag}>')

    def handle_data(self, text):
        self.output.append(text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

    def handle_entityref(self, name):
        self.output.append(f'&{name};')

    def handle_charref(self, name):
        self.output.append(f'&#{name};')


institutional = {}
for name in ['sobre', 'como-funciona', 'faq', 'politica-privacidade', 'termos', 'troca-devolucao', 'politica-entrega', 'politica-cookies', 'contato']:
    main = re.search(r'<main\b[\s\S]*?</main>', pages[name]).group(0)
    clean = CleanContent()
    clean.feed(re.sub(r'<!--[\s\S]*?-->', '', main))
    institutional[name] = ''.join(clean.output)
save('src/data/institutional.json', json.dumps(institutional, ensure_ascii=False, indent=2))
assets = {product['image'] for product in catalog}
assets.update(['/assets/fonts/manrope-latin.woff2', '/assets/fonts/librecaslondisplay-latin.woff2', '/cdn/catalog/proprias/315-hero.webp', '/favicon.svg'])
for html in pages.values():
    assets.update(urlsplit(path).path for path in re.findall(r'(?:src|poster)="((?:/cdn/|/assets/img/)[^"]+)"', html))


def download(path):
    target = root / 'public' / path.lstrip('/')
    if target.exists() and target.stat().st_size > 0:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(['curl', '-fLsS', '--max-time', '25', 'https://www.buquederosas.delivery' + path, '-o', str(target)], capture_output=True, text=True)
    return f'{path}: {result.stderr.strip()}' if result.returncode else None


with ThreadPoolExecutor(max_workers=12) as pool:
    errors = [error for error in pool.map(download, sorted(assets)) if error]
print(f'{len(catalog)} products; {len(pages)} page styles; {len(assets)} assets; {len(errors)} failures')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
