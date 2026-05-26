import fitz
import sys

path = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\sanne\Downloads\Dashboard.pdf"
doc = fitz.open(path)
for pno in range(len(doc)):
    page = doc[pno]
    words = page.get_text("words")
    annots = list(page.annots())
    print(f"\n=== Page {pno + 1} ===")
    for i, a in enumerate(annots):
        r = a.rect
        hits = []
        for w in words:
            x0, y0, x1, y1, txt = w[0], w[1], w[2], w[3], w[4]
            if x1 >= r.x0 and x0 <= r.x1 and y1 >= r.y0 and y0 <= r.y1:
                hits.append(txt)
        label = " ".join(hits) if hits else "(no text)"
        print(f"  H{i+1}: {label}  [{r.x0:.0f},{r.y0:.0f}-{r.x1:.0f},{r.y1:.0f}]")
doc.close()
