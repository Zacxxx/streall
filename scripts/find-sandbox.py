import re
with open("streamingnow.html", "r", encoding="utf-8", errors="ignore") as f:
    data = f.read()
for m in re.finditer(r'setAttribute\(\"sandbox\",([^)]*)\)', data):
    print('sandbox attr:', m.group(1))
