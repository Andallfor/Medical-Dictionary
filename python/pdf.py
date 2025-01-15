import pymupdf
pymupdf.TOOLS.store_maxsize = 0

doc = pymupdf.open('C:/Users/andallfor/Downloads/Core Radiology A Visual Approach to Diagnostic Imaging (Jacob Mandell).pdf')
out = open("output.txt", "wb")

length = len(doc)
for i, page in enumerate(doc):
    text = page.get_text().encode("utf8") # get plain text (is in UTF-8)
    out.write(text) # write text of page

    if (i % 100 == 0 or i == length - 1):
        print(f"On page {i + 1}/{length}")
out.close()