import re
with open("multiembed.html", "r", encoding="utf-8", errors="ignore") as f:
    data = f.read()
pattern = re.compile(r'<iframe[^>]+src=(?:"([^"]*)"|\'([^\']*)\')', re.IGNORECASE)
for match in pattern.finditer(data):
    src = match.group(1) or match.group(2)
    print(src)
