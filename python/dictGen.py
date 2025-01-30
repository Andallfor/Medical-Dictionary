from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
import re
import codecs

opt = Options()
opt.add_argument('--headless')
driver = webdriver.Firefox(options=opt)

def get(t: str):
    driver.get(f'https://www.oed.com/dictionary/{t}?tab=pronunciation')
    groups = driver.find_element(By.ID, 'pronunciation_groups').find_elements(By.CLASS_NAME, 'pronunciation-group')

    out = []

    for group in groups:
        data = [t.split('_')[0], '']
        header = group.find_elements(By.CLASS_NAME, 'header')

        if (header):
            data[0] = header[0].text.split(' ')[-1]
        
        pron = group.find_elements(By.CLASS_NAME, 'regional-pronunciation')
        for p in pron:
            if 'U.S.' in p.text:
                data[1] = p.find_element(By.CLASS_NAME, 'pronunciation-ipa').text.strip('/')
                break
        else:
            data[1] = pron[0].find_element(By.CLASS_NAME, 'pronunciation-ipa').text.strip('/')

        out.append(data)
    
    return out

def search(t: str):
    driver.get(f'https://www.oed.com/search/dictionary/?scope=Entries&q={t}')
    res = driver.find_element(By.CLASS_NAME, 'searchSummary').find_element(By.TAG_NAME, 'div')
    
    corrected = driver.find_elements(By.CLASS_NAME, 'didYouMean')
    if corrected:
        return search(corrected[0].find_element(By.TAG_NAME, 'ul').text)
    else: # exact value
        hw = driver.find_elements(By.CLASS_NAME, 'resultTitle')
        if hw:
            return hw[0].get_property('id')
        return None

visited = set()
i = 0
n = 400
with open('python/out.txt', 'w', encoding='utf-16') as formatted:
    formatted.write('\ufeff')
    with open('python/index.txt', encoding='utf-8') as file:
        for line in file:
            words = re.split(r' |,|/|\(|\)', line)
            for word in words:
                word = word.strip()
                if len(word) == 0 or any(i.isdigit() for i in word) or word in visited:
                    continue
                visited.add(word)

                try:
                    print(f'Searching for {word}', end='')
                    sanitized = search(word)
                    print(f' as {sanitized}', end='')
                    if sanitized:
                        pron = get(sanitized)
                        for p in pron:
                            formatted.write(f'{p[0]}={p[1]}\n')
                        
                        print(f' found {pron}', end='')
                        i += 1
                        print(f' ({i}/{n})')
                    else:
                        print("ERROR: " + word)
                except:
                    print()
                    pass

            if (i >= n):
                break

driver.close()