# 市区町村人口データ

このフォルダは、人口ブラックジャックで使う市区町村カードのデータ置き場です。

- `municipalities.csv`: 収集・確認用の元データ
- `municipalities.js`: アプリが読み込む配信用データ

現在のデータはカテゴリ別に5件ずつ入れた仮データです。正式データへ差し替えるときは、人口、時点、出典を必ず確認してください。

## 列

- `id`: `prefecture-municipality` 形式の一意ID
- `prefecture`: 都道府県
- `municipality`: 市区町村名
- `population`: 人口。半角数字、カンマなし
- `category`: 抽選重みに使う人口帯
- `populationDate`: 人口の時点
- `sourceName`: 出典名
- `sourceUrl`: 出典URL

## カテゴリ

カテゴリはゲームバランス用の人口帯です。あとで人口値から再分類できます。

- `village_town`: 5万人未満
- `small_city`: 5万人以上10万人未満
- `mid_city`: 10万人以上20万人未満
- `large_city`: 20万人以上70万人未満
- `ordinance_city`: 70万人以上
