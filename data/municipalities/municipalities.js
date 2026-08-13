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

export const DRAW_PROFILES = {
  "ntt-data-employees": {
    village_town: 0.5,
    small_city: 2,
    mid_city: 5,
    large_city: 2,
    ordinance_city: 0.2
  },
  "toyosu-station-total": {
    village_town: 0.5,
    small_city: 2,
    mid_city: 4,
    large_city: 2,
    ordinance_city: 0.2
  },
  "ntt-group-employees": {
    village_town: 0.2,
    small_city: 1,
    mid_city: 3,
    large_city: 5,
    ordinance_city: 1
  },
  "koto-city-population": {
    village_town: 0.1,
    small_city: 0.5,
    mid_city: 2,
    large_city: 5,
    ordinance_city: 1
  },
  "ntt-shareholders": {
    village_town: 0.05,
    small_city: 0.2,
    mid_city: 1,
    large_city: 3,
    ordinance_city: 6
  }
};

export const DEFAULT_DRAW_PROFILE = {
  village_town: 1,
  small_city: 1,
  mid_city: 1,
  large_city: 1,
  ordinance_city: 1
};
