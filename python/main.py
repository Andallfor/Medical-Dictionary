import os
import pymupdf
import sys
import re
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By

class PDF_TYPE:
    CORE_RADIOLOGY = 0
    DIA_IMG_HEAD_NECK = 1
    DIA_IMG_BRAIN = 2
    DIA_IMG_SPINE = 3
    DIA_IMG_PEDIATRIC_NEURO = 4

FOLDER_INPUT = 'pdfs'
FOLDER_OUTPUT = 'out'

class PDF:
    def __init__(self):
        dn = os.path.dirname(__file__)
        self.pdf = os.path.join(dn, FOLDER_INPUT, self.FILE_PDF_NAME)
        self.txt = os.path.join(dn, FOLDER_INPUT, self.FILE_TXT_NAME)
        self.pron = os.path.join(dn, FOLDER_OUTPUT, self.FILE_OUT_NAME)
    
    def toTxt(self, force: bool = False):
        if (force or not os.path.exists(self.txt)):
            pymupdf.TOOLS.store_maxsize = 0

            with open(self.txt, 'w') as file:
                print(f"Converting {self.FILE_PDF_NAME}")
                doc = pymupdf.open(self.pdf)
                length = len(doc)
                for i, page in enumerate(doc):
                    text = page.get_text().encode("ascii", errors='ignore').decode()
                    file.write(text)

                    if (i % 100 == 0 or i == length - 1):
                        sys.stdout.write('\r')
                        sys.stdout.write(f'Page {i + 1}/{length}')
                        sys.stdout.flush()
    
    def _getIndex(self):
        lines = []
        with open(self.txt, 'r', encoding='utf-8') as file:
            for i, line in enumerate(file):
                if i >= self.INDEX_LINE - 1:
                    lines.append(line)

        return lines
    
    def get(self, t: str, driver):
        driver.get(f'https://www.oed.com/dictionary/{t}?tab=pronunciation')
        try:
            groups = driver.find_element(By.ID, 'pronunciation_groups').find_elements(By.CLASS_NAME, 'pronunciation-group')
        except:
            return []

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

    def search(self, t: str, driver):
        driver.get(f'https://www.oed.com/search/dictionary/?scope=Entries&q={t}')
        
        corrected = driver.find_elements(By.CLASS_NAME, 'didYouMean')
        if corrected:
            return self.search(corrected[0].find_element(By.TAG_NAME, 'ul').text, driver)
        else: # exact value
            hw = driver.find_elements(By.CLASS_NAME, 'resultTitle')
            if hw:
                return hw[0].get_property('id')
            return None

    def process(self):
        raise NotImplementedError('Get index is not implemented')
    
    def write(self, driver, words, skip = 0, count = -1):
        with open(self.pron, 'w', encoding='utf-16') as out:
            written = 0
            l = len(words)
            for i, word in enumerate(words):
                if (i < skip):
                    continue

                try:
                    print(f'Searching for {word}', end='')
                    sanitized = self.search(word, driver)
                    print(f' as {sanitized} ', end='')
                    if sanitized:
                        pron = self.get(sanitized, driver)
                        if (len(pron) == 0):
                            print(f'\033[93mfound nothing! (Likely lacks defined pronunciation)\033[0m')
                        else:
                            for p in pron:
                                out.write(f'{p[0]}={p[1]}\n')

                            print(f'found {pron} ', end='')
                            written += 1
                            print(f'{written}/{l - i}/{l}')
                    else:
                        print("\033[91mERROR: " + word + '\033[0m')
                except Exception as e:
                    print(e)
            
                if (count != -1 and written >= count):
                    return
                
                if (i % 50 == 0):
                    out.flush()
                    print(f'\033[96mCheckpoint: word {i}\033[0m')

    def run(self, driver, ignore=set()):
        self.toTxt()
        return self.process(driver, ignore)

    def loadIgnore(self):
        if (not os.path.exists(self.pron)):
            return set()

        with open(self.pron, encoding='utf-16') as file:
            ignore = set()
            for line in file:
                key, pron = line.split('=')
                ignore.add(key)
        
        return ignore

class PDF_CORE_RAD(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'Core Radiology A Visual Approach to Diagnostic Imaging (Jacob Mandell).pdf'
        self.FILE_TXT_NAME = 'core_rad.txt'
        self.FILE_OUT_NAME = '_out_core_rad.txt'
        self.INDEX_LINE = 36197

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for line in LINES:
            words = re.split(r' |,|/|\(|\)', line)
            for word in words:
                word = word.strip()
                word = re.sub('[0-9]+','', word)

                if word in ignore:
                    continue

                text.add(word)
        
        super().write(driver, text)
        
        return text

class PDF_DIA_HEAD(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'Diagnostic Imaging Head and Neck (Bernadette L. Koch MD, Surjith Vattoth MD FRCR etc.).pdf'
        self.FILE_TXT_NAME = 'dia_head.txt'
        self.FILE_OUT_NAME = '_out_dia_head.txt'
        self.INDEX_LINE = 110410

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for line in LINES:
            line = re.sub(r'vs.|\"|[0-9]|\(|\)|- |&|1st|2nd|3rd|\.', '', line)
            words = re.split(r' |,', line)

            for word in words:
                word = word.strip()
                if len(word) < 3:
                    continue
                    
                if word in ignore:
                    continue

                text.add(word.lower())

        super().write(driver, text)
        
        return text

opt = Options()
opt.add_argument('--headless')
driver = webdriver.Firefox(options=opt)

core_rad = PDF_CORE_RAD()
# ignore = core_rad.run(driver)


dia_head = PDF_DIA_HEAD()
dia_head.run(driver, ignore=core_rad.loadIgnore())
