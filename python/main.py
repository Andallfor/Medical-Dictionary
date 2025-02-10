import os
import pymupdf
import sys
import re
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from retry import retry
import time
import datetime
import math

class PDF_TYPE:
    CORE_RADIOLOGY = 0
    DIA_IMG_HEAD_NECK = 1
    DIA_IMG_BRAIN = 2
    DIA_IMG_SPINE = 3
    DIA_IMG_PEDIATRIC_NEURO = 4

FOLDER_INPUT = 'pdfs'
FOLDER_OUTPUT = 'out'

def join(pdfs, fileLoc):
    visited = set()
    combinedTotal = 0
    with open(fileLoc, 'w', encoding='utf-16') as out:
        for pdf in pdfs:
            data = pdf.loadRead()
            combinedTotal += len(data)
            for (key, val) in data:
                if key in visited:
                    continue
                visited.add(key)

                out.write(f'{key}={val}')
    
    print(f'Filtered {combinedTotal} lines in {len(pdfs)} files into {len(visited)} lines ({combinedTotal - len(visited)} duplicates)')

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

    @retry(TimeoutException, tries=3, delay=2)
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

            if (header and 'In sense' not in header[0].text):
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

    @retry(TimeoutException, tries=3, delay=2)
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
        words = sorted(words) # since we need them to be stable
        start = time.time()
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
                    elapsed = time.time() - start
                    spw = elapsed / max(written, 1)
                    remaining = spw * (l - i)

                    a = datetime.timedelta(seconds=math.floor(remaining))
                    b = math.floor(1000 * spw)
                    c = datetime.timedelta(seconds=math.floor(elapsed))

                    print(f'\033[96mCheckpoint: word {i}\033[0m ({a}/{b}ms/{c})')

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
    
    def loadRead(self):
        if (not os.path.exists(self.pron)):
            return set()
        
        out = set()
        with open(self.pron, encoding='utf-16') as file:
            for line in file:
                key, pron = line.split('=')
                out.add((key, pron))
        
        return out

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

class PDF_DIA_BRAIN(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'Diagnostic Imaging Brain Index.pdf'
        self.FILE_TXT_NAME = 'dia_brain.txt'
        self.FILE_OUT_NAME = '_out_dia_brain.txt'
        self.INDEX_LINE = 4

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for line in LINES:
            line = re.sub(r'vs.|\"|[0-9]|\(|\)|- |&|1st|2nd|3rd|\.', '', line)
            words = re.split(r' |,|/', line)

            for word in words:
                word = word.strip()
                if len(word) < 3:
                    continue
                    
                if word in ignore:
                    continue

                text.add(word.lower())

        super().write(driver, text)
        
        return text

class PDF_DIA_SPINE(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'Diagnostic Imaging Spine Index.pdf'
        self.FILE_TXT_NAME = 'dia_spine.txt'
        self.FILE_OUT_NAME = '_out_dia_spine.txt'
        self.INDEX_LINE = 4

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for line in LINES:
            line = re.sub(r'vs.|\"|[0-9]|\(|\)|- |&|1st|2nd|3rd|\.', '', line)
            words = re.split(r' |,|/', line)

            for word in words:
                word = word.strip()
                if len(word) < 3:
                    continue
                    
                if word in ignore:
                    continue

                text.add(word.lower())

        super().write(driver, text)
        
        return text

class PDF_DIA_PED(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'Diagnostic Imaging Pediatric Neuroradiology (Kevin R. Moore).pdf'
        self.FILE_TXT_NAME = 'dia_ped.txt'
        self.FILE_OUT_NAME = '_out_dia_ped.txt'
        self.INDEX_LINE = 90976

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for line in LINES:
            line = re.sub(r'vs.|\"|[0-9]|\(|\)|- |&|1st|2nd|3rd|\.', '', line)
            words = re.split(r' |,|/', line)

            for word in words:
                word = word.strip()
                if len(word) < 3:
                    continue
                    
                if word in ignore:
                    continue

                text.add(word.lower())

        super().write(driver, text)
        
        return text

class PDF_COMMON(PDF):
    def __init__(self):
        self.FILE_PDF_NAME = 'google-10000-english-usa.txt'
        self.FILE_TXT_NAME = 'google-10000-english-usa.txt'
        self.FILE_OUT_NAME = '_out_common.txt'
        self.INDEX_LINE = 0

        super().__init__()
    
    def process(self, driver, ignore=set(), skip = 0):
        LINES = super()._getIndex()

        text = set()
        for word in LINES:
            word = word.strip()
            if word in ignore:
                continue

            if len(word) < 3:
                continue

            text.add(word.lower())

        super().write(driver, text)
        
        return text


opt = Options()
opt.add_argument('--headless')
driver = webdriver.Firefox(options=opt)
driver.set_page_load_timeout(10)

core_rad = PDF_CORE_RAD()
dia_head = PDF_DIA_HEAD()
dia_brain = PDF_DIA_BRAIN()
dia_spine = PDF_DIA_SPINE()
dia_ped = PDF_DIA_PED()

common_words = PDF_COMMON()
ignore = core_rad.loadIgnore() | dia_head.loadIgnore() | dia_brain.loadIgnore() | dia_spine.loadIgnore() | dia_ped.loadIgnore()

common_words.run(driver, ignore=ignore)

join([core_rad, dia_head, dia_brain, dia_spine, dia_ped, common_words], os.path.join(os.path.dirname(__file__), FOLDER_OUTPUT, 'processed.txt'))
