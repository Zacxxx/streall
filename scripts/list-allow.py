import re
with open("streamingnow.html", "r", encoding="utf-8", errors="ignore") as f:
    data = f.read()
for match in re.finditer(r'setAttribute\("allow","([^"]*)"\)', data):
    print("allow attr:", match.group(1))
