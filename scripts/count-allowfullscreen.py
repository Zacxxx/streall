import re
with open("streamingnow.html", "r", encoding="utf-8", errors="ignore") as f:
    data = f.read()
print("allowfullscreen occurrences:", data.count("allowfullscreen"))
