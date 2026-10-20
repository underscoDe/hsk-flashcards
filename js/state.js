export const DATA_URLS = {
  '1': '/data/hsk-level-1.json',
  '2': '/data/hsk-level-2.json',
  '3': '/data/hsk-level-3.json',
  '4': '/data/hsk-level-4.json',
  '5': '/data/hsk-level-5.json',
  '6': '/data/hsk-level-6.json',
};

export const LEVEL_COUNTS = {
  '1': 150, '2': 150, '3': 299, '4': 601, '5': 1300, '6': 2500,
};

export const cfg = {
  level:               '1',   // '1'–'6' or 'combo'
  comboLevels:         [],
  order:               'random',
  presentationShuffle: false,
  count:               25,
  rangeFrom:           null,  // 1-indexed, overrides count when both set
  rangeTo:             null,
  cardMode:            'hanzi-first', // 'hanzi-first' | 'pinyin-first'
};

export const session = {
  words:        [],
  currentIndex: 0,
  isFlipped:    false,
  known:        new Set(),
  unknown:      new Set(),
};

export const cache = {};
