// Uzbek Latin ↔ Cyrillic Transliterator

const latinToCyrillicMap = {
  // Digraphs first (order matters)
  "Sh": "Ш", "sh": "ш",
  "Ch": "Ч", "ch": "ч",
  "Ng": "Нг", "ng": "нг",
  "O'": "Ў", "o'": "ў", "O\u2018": "Ў", "o\u2018": "ў", "Oʻ": "Ў", "oʻ": "ў",
  "G'": "Ғ", "g'": "ғ", "G\u2018": "Ғ", "g\u2018": "ғ", "Gʻ": "Ғ", "gʻ": "ғ",
  // Single characters
  "A": "А", "a": "а",
  "B": "Б", "b": "б",
  "D": "Д", "d": "д",
  "E": "Е", "e": "е",
  "F": "Ф", "f": "ф",
  "G": "Г", "g": "г",
  "H": "Ҳ", "h": "ҳ",
  "I": "И", "i": "и",
  "J": "Ж", "j": "ж",
  "K": "К", "k": "к",
  "L": "Л", "l": "л",
  "M": "М", "m": "м",
  "N": "Н", "n": "н",
  "O": "О", "o": "о",
  "P": "П", "p": "п",
  "Q": "Қ", "q": "қ",
  "R": "Р", "r": "р",
  "S": "С", "s": "с",
  "T": "Т", "t": "т",
  "U": "У", "u": "у",
  "V": "В", "v": "в",
  "X": "Х", "x": "х",
  "Y": "Й", "y": "й",
  "Z": "З", "z": "з",
};

const cyrillicToLatinMap = {
  // Digraphs / special
  "Ш": "Sh", "ш": "sh",
  "Ч": "Ch", "ч": "ch",
  "Ў": "O'", "ў": "o'",
  "Ғ": "G'", "ғ": "g'",
  "Қ": "Q", "қ": "q",
  "Ҳ": "H", "ҳ": "h",
  // Standard
  "А": "A", "а": "a",
  "Б": "B", "б": "b",
  "В": "V", "в": "v",
  "Г": "G", "г": "g",
  "Д": "D", "д": "d",
  "Е": "E", "е": "e",
  "Ё": "Yo", "ё": "yo",
  "Ж": "J", "ж": "j",
  "З": "Z", "з": "z",
  "И": "I", "и": "i",
  "Й": "Y", "й": "y",
  "К": "K", "к": "k",
  "Л": "L", "л": "l",
  "М": "M", "м": "m",
  "Н": "N", "н": "n",
  "О": "O", "о": "o",
  "П": "P", "п": "p",
  "Р": "R", "р": "r",
  "С": "S", "с": "s",
  "Т": "T", "т": "t",
  "У": "U", "у": "u",
  "Ф": "F", "ф": "f",
  "Х": "X", "х": "x",
  "Э": "E", "э": "e",
  "Ю": "Yu", "ю": "yu",
  "Я": "Ya", "я": "ya",
  "Ъ": "'", "ъ": "'",
  "Ь": "", "ь": "",
};

// Build sorted keys for longest-match-first
const latinKeys = Object.keys(latinToCyrillicMap).sort((a, b) => b.length - a.length);
const cyrillicKeys = Object.keys(cyrillicToLatinMap).sort((a, b) => b.length - a.length);

function containsCyrillic(text) {
  return /[\u0400-\u04FF]/.test(text);
}

function containsLatin(text) {
  return /[a-zA-Z]/.test(text);
}

export function latinToCyrillic(text) {
  if (!text) return '';
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const key of latinKeys) {
      if (text.substring(i, i + key.length) === key) {
        result += latinToCyrillicMap[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

export function cyrillicToLatin(text) {
  if (!text) return '';
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const key of cyrillicKeys) {
      if (text.substring(i, i + key.length) === key) {
        result += cyrillicToLatinMap[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

export function transliterate(text, targetScript) {
  if (!text) return '';
  if (targetScript === 'kirill') {
    // If already Cyrillic, return as-is
    if (containsCyrillic(text) && !containsLatin(text)) return text;
    return latinToCyrillic(text);
  }
  // Target is Latin
  if (containsLatin(text) && !containsCyrillic(text)) return text;
  return cyrillicToLatin(text);
}
