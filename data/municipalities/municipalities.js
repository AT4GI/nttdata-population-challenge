export const MUNICIPALITIES = [
  { id: "hokkaido-kamishihoro", name: "上士幌町", prefecture: "北海道", population: 4748, category: "village_town", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "nagano-obuse", name: "小布施町", prefecture: "長野県", population: 10387, category: "village_town", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "yamanashi-fujikawaguchiko", name: "富士河口湖町", prefecture: "山梨県", population: 26548, category: "village_town", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "shizuoka-atami", name: "熱海市", prefecture: "静岡県", population: 34396, category: "village_town", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "toyama-himi", name: "氷見市", prefecture: "富山県", population: 41700, category: "village_town", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },

  { id: "ishikawa-nanao", name: "七尾市", prefecture: "石川県", population: 49000, category: "small_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "yamaguchi-hagi", name: "萩市", prefecture: "山口県", population: 44000, category: "small_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "wakayama-tanabe", name: "田辺市", prefecture: "和歌山県", population: 69000, category: "small_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "fukuoka-dazaifu", name: "太宰府市", prefecture: "福岡県", population: 71812, category: "small_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "kyoto-maizuru", name: "舞鶴市", prefecture: "京都府", population: 77650, category: "small_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },

  { id: "gifu-takayama", name: "高山市", prefecture: "岐阜県", population: 84000, category: "mid_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "kagawa-marugame", name: "丸亀市", prefecture: "香川県", population: 109589, category: "mid_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "nara-kashihara", name: "橿原市", prefecture: "奈良県", population: 119250, category: "mid_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "hiroshima-onomichi", name: "尾道市", prefecture: "広島県", population: 126000, category: "mid_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "ehime-imabari", name: "今治市", prefecture: "愛媛県", population: 151672, category: "mid_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },

  { id: "tokyo-mitaka", name: "三鷹市", prefecture: "東京都", population: 195391, category: "large_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "kanagawa-atsugi", name: "厚木市", prefecture: "神奈川県", population: 223705, category: "large_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "nagasaki-sasebo", name: "佐世保市", prefecture: "長崎県", population: 239636, category: "large_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "osaka-ibaraki", name: "茨木市", prefecture: "大阪府", population: 285715, category: "large_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "tokyo-hachioji", name: "八王子市", prefecture: "東京都", population: 579355, category: "large_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },

  { id: "kumamoto-kumamoto", name: "熊本市", prefecture: "熊本県", population: 738000, category: "ordinance_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "hiroshima-hiroshima", name: "広島市", prefecture: "広島県", population: 1194000, category: "ordinance_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "fukuoka-fukuoka", name: "福岡市", prefecture: "福岡県", population: 1640000, category: "ordinance_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "aichi-nagoya", name: "名古屋市", prefecture: "愛知県", population: 2327000, category: "ordinance_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" },
  { id: "kanagawa-yokohama", name: "横浜市", prefecture: "神奈川県", population: 3772000, category: "ordinance_city", populationDate: "sample", sourceName: "仮データ", sourceUrl: "" }
];

// Approximate municipal-office coordinates used by the map display.
export const MUNICIPALITY_LOCATIONS = {
  "hokkaido-kamishihoro": [43.2325, 143.2962],
  "nagano-obuse": [36.6979, 138.3120],
  "yamanashi-fujikawaguchiko": [35.4973, 138.7551],
  "shizuoka-atami": [35.0960, 139.0716],
  "toyama-himi": [36.8567, 136.9880],
  "ishikawa-nanao": [37.0431, 136.9675],
  "yamaguchi-hagi": [34.4081, 131.3991],
  "wakayama-tanabe": [33.7280, 135.3777],
  "fukuoka-dazaifu": [33.5128, 130.5239],
  "kyoto-maizuru": [35.4748, 135.3859],
  "gifu-takayama": [36.1461, 137.2522],
  "kagawa-marugame": [34.2896, 133.7977],
  "nara-kashihara": [34.5094, 135.7925],
  "hiroshima-onomichi": [34.4089, 133.2049],
  "ehime-imabari": [34.0662, 132.9979],
  "tokyo-mitaka": [35.6835, 139.5596],
  "kanagawa-atsugi": [35.4431, 139.3625],
  "nagasaki-sasebo": [33.1799, 129.7151],
  "osaka-ibaraki": [34.8164, 135.5686],
  "tokyo-hachioji": [35.6664, 139.3160],
  "kumamoto-kumamoto": [32.8031, 130.7079],
  "hiroshima-hiroshima": [34.3853, 132.4553],
  "fukuoka-fukuoka": [33.5902, 130.4017],
  "aichi-nagoya": [35.1815, 136.9066],
  "kanagawa-yokohama": [35.4437, 139.6380]
};

export const DRAW_PROFILES = {
  "ntt-data-employees": {
    village_town: 15,
    small_city: 25,
    mid_city: 45,
    large_city: 12,
    ordinance_city: 3
  },
  "toyosu-station-total": {
    village_town: 12,
    small_city: 23,
    mid_city: 45,
    large_city: 16,
    ordinance_city: 4
  },
  "ntt-group-employees": {
    village_town: 8,
    small_city: 18,
    mid_city: 38,
    large_city: 28,
    ordinance_city: 8
  },
  "koto-city-population": {
    village_town: 5,
    small_city: 12,
    mid_city: 30,
    large_city: 40,
    ordinance_city: 13
  },
  "three-million-challenge": {
    village_town: 3,
    small_city: 7,
    mid_city: 18,
    large_city: 32,
    ordinance_city: 40
  },
  "ntt-shareholders": {
    village_town: 3,
    small_city: 7,
    mid_city: 15,
    large_city: 30,
    ordinance_city: 45
  }
};

export const DEFAULT_DRAW_PROFILE = {
  village_town: 20,
  small_city: 20,
  mid_city: 20,
  large_city: 20,
  ordinance_city: 20
};
