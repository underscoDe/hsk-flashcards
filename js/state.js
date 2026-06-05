export const DATA_URLS = {
  '1': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-1.json',
  '2': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-2.json',
  '3': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-3.json',
  '4': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-4.json',
  '5': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-5.json',
  '6': 'https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/json/hsk-level-6.json',
};

export const LEVEL_COUNTS = {
  '1': 150, '2': 150, '3': 299, '4': 601, '5': 585, '6': 500,
};

export const cfg = {
  level:               '1',   // '1'–'6' or 'combo'
  comboLevels:         [],
  order:               'random',
  presentationShuffle: false,
  count:               25,
  rangeFrom:           null,  // 1-indexed, overrides count when both set
  rangeTo:             null,
};

export const session = {
  words:        [],
  currentIndex: 0,
  isFlipped:    false,
  known:        new Set(),
  unknown:      new Set(),
};

export const cache = {};
