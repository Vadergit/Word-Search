from pathlib import Path
from urllib.request import urlopen
import re
import textwrap

SOURCE_COMMIT = "607740452a3ab042de0248dcab1ff0fbe54fcae0"
SOURCE_URL = f"https://raw.githubusercontent.com/gautesolheim/25000-syllabified-words-list/{SOURCE_COMMIT}/all-words-sorted-by-frequency.txt"

# Keep a broad offline vocabulary, but exclude obvious web/file abbreviations
# that are not useful as normal word-game words.
BLOCKED = {
    "www","http","https","html","htm","php","asp","aspx","xml","css","rss",
    "jpg","jpeg","png","gif","bmp","pdf","exe","dll","zip","rar","mp3","mp4",
    "com","org","net","gov","edu","mil","ftp","url","urls"
}

raw = urlopen(SOURCE_URL, timeout=30).read().decode("utf-8")
words=[]
seen=set()
for line in raw.splitlines():
    # Source contains syllable separators such as a;bout -> about.
    word=line.strip().lower().replace(";","")
    if not re.fullmatch(r"[a-z]+", word):
        continue
    if not (3 <= len(word) <= 16):
        continue
    if word in BLOCKED or word in seen:
        continue
    seen.add(word)
    words.append(word.upper())

# The source is frequency-sorted; keeping up to 25k preserves common words first.
words=words[:25000]
if len(words) < 18000:
    raise SystemExit(f"Unexpectedly small dictionary after filtering: {len(words)}")

wrapped="\n".join(textwrap.wrap(" ".join(words), width=150, break_long_words=False, break_on_hyphens=False))
words_js = f'''/*
  Anitas Word Path - expanded offline English bonus dictionary
  Generated from gautesolheim/25000-syllabified-words-list
  pinned at commit {SOURCE_COMMIT} (Unlicense / public domain dedication).
  Only ASCII alphabetic words of 3-16 letters are included.
*/
(() => {{
  const data = `
{wrapped}
  `.trim();
  window.ANITAS_ENGLISH_WORDS = new Set(data.split(/\\s+/));
  window.ANITAS_ENGLISH_WORD_COUNT = window.ANITAS_ENGLISH_WORDS.size;
}})();
'''
Path("words.js").write_text(words_js, encoding="utf-8")

source_md = f'''# Offline English word list

`words.js` is generated from the public word list in
`gautesolheim/25000-syllabified-words-list`, pinned to commit
`{SOURCE_COMMIT}`.

Source file: `all-words-sorted-by-frequency.txt`

The source repository releases the list under the Unlicense/public-domain
dedication. The generated list removes syllable separators, keeps only ASCII
alphabetic words between 3 and 16 letters, removes a small set of obvious
web/file abbreviations, removes duplicates, uppercases the entries, and keeps
at most the first 25,000 frequency-sorted words.

The expanded list is used only for final bonus-word validation. It is not used
by the puzzle generator.
'''
Path("WORDLIST_SOURCE.md").write_text(source_md, encoding="utf-8")

p=Path("index.html")
text=p.read_text(encoding="utf-8")

# Load dictionary once before the main game script. Built-in BONUS_WORDS remains
# a fallback if this file is ever missing.
marker='<script>\n(() => {'
if '<script src="words.js"></script>' not in text:
    if marker not in text:
        raise SystemExit("Could not find main script marker")
    text=text.replace(marker, '<script src="words.js"></script>\n<script>\n(() => {', 1)

old='''  const MIN_BONUS_LENGTH = 3;'''
new='''  const MIN_BONUS_LENGTH = 3;\n  const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS instanceof Set ? window.ANITAS_ENGLISH_WORDS : new Set();'''
if 'const ENGLISH_WORDS = window.ANITAS_ENGLISH_WORDS' not in text:
    if old not in text:
        raise SystemExit("Could not find bonus constants")
    text=text.replace(old,new,1)

old='''    if(word.length>=MIN_BONUS_LENGTH&&BONUS_WORDS.has(word)&&!targets.includes(word)){'''
new='''    if(word.length>=MIN_BONUS_LENGTH&&(BONUS_WORDS.has(word)||ENGLISH_WORDS.has(word))&&!targets.includes(word)){'''
if new not in text:
    if old not in text:
        raise SystemExit("Could not find bonus validation condition")
    text=text.replace(old,new,1)

text=text.replace('''      empty.textContent="Extra English words score bonus points.";''','''      empty.textContent=`Expanded offline dictionary · ${ENGLISH_WORDS.size.toLocaleString()} words available for bonus points.`;''',1)

badge='''      <span style="padding:6px 9px;border-radius:999px;background:#f1f5f1;border:1px solid #e1e8e1;font-size:11px;font-weight:800;color:#5f6d64;">100% offline</span>'''
extra='''      <span style="padding:6px 9px;border-radius:999px;background:#f1f5f1;border:1px solid #e1e8e1;font-size:11px;font-weight:800;color:#5f6d64;">20k+ bonus words</span>\n'''+badge
if '20k+ bonus words' not in text:
    if badge not in text:
        raise SystemExit("Could not find start badges")
    text=text.replace(badge,extra,1)

assert '<script src="words.js"></script>' in text
assert 'ENGLISH_WORDS.has(word)' in text
assert 'const RESET_DELAY = 1500;' in text
assert 'Hint tiles highlighted' in text
p.write_text(text,encoding="utf-8")

print(f"Generated {len(words)} offline English words")
