from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By

opt = Options()
opt.add_argument('--headless')
driver = webdriver.Firefox(options=opt)

def get(t: str):
    driver.get(f'https://www.oed.com/dictionary/{t}_n?tab=pronunciation')
    groups = driver.find_element(By.ID, 'pronunciation_groups').find_elements(By.CLASS_NAME, 'pronunciation-group')

    out = []

    for group in groups:
        data = [t, '']
        header = group.find_elements(By.CLASS_NAME, 'header')

        if (header):
            data[0] = header[0].text.split(' ')[-1]
        
        pron = group.find_elements(By.CLASS_NAME, 'regional-pronunciation')
        for p in pron:
            if 'U.S.' in p.text:
                data[1] = p.find_element(By.CLASS_NAME, 'pronunciation-ipa').text
                break
        
        out.append(data)
    
    return out

print(get('nephritis'))

driver.close()