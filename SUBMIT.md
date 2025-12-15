# Glitch Hunter Library (Base Mini App) — SUBMIT

## One-line
ゲームの“伝説級バグ”をカード化して保存し、**投稿の同一性ハッシュ(bytes32)だけをBase mainnetにスタンプ**して「これは確かに存在した」を刻むミニアプリ。

## 「こんなの面白そう！」ポイント（ogiri）
- “なぞのばしょ”みたいな都市伝説系バグを、**オンチェーンの「博物館スタンプ」**として封印できる。
- 本文や動画は載せず、**ハッシュだけ**刻むから軽い・安全・共有しやすい。

## Baseをどう使ってる？
- 投稿ごとにサーバー側で`stampHash(bytes32)`を生成（改ざんしづらい“指紋”）。
- その`stampHash`を、誰でも **Stamp on Base** ボタンで **Base mainnet(chainId 8453)** に書き込める。
- 成功したら UI に `Onchain stamped ✅` + **basescan.org** txリンク + `stampHash`コピーを表示。

## Demo URL
- https://base-glitch-hunter-library.vercel.app

## デモで見せたいネタ（推奨）
### Pokémon Diamond/Pearl: 「なぞのばしょ」バグ
- タイトル例: `なぞのばしょに行ける（DP版）`
- ゲーム名: `Pokémon Diamond / Pearl`
- 動画URL: YouTubeの解説/再現動画
- 説明例（短く強く）:
  - `GTS/なぞのばしょ経由で本来行けない空間へ。都市伝説が“再現可能な仕様”として残る。`

## 1分デモ台本（そのまま読めます）
1. 「ゲームのバグって、再現できても“記録が消える”と都市伝説化する。そこで“バグの博物館”を作りました。」
2. 「これはポケモンダイパの“なぞのばしょ”。まず投稿します（/submit）。」
3. 「投稿した瞬間に、サーバーが“投稿の指紋”= `stampHash(bytes32)` を作ります（内容はオンチェーンに載りません）。」
4. 「ここで **Stamp on Base** を押すと、その`bytes32`だけがBase mainnetに刻まれます。」
5. 「はい、`Onchain stamped ✅`。これが“このバグは確かに存在した”の証拠で、txもbasescanで誰でも検証できます。」

## Onchain stamp hash format (canonical)
Payloadは **改行区切り・固定順**（7行）:

1. `version=1`
2. `title`
3. `game`
4. `videoUrl`
5. `description`
6. `createdAtISO`
7. `authorIdentifier`（wallet or fid。無い場合は空文字）

Notes:
- 各フィールド内の改行は `\n` に正規化した上で `\\n` にエスケープし、常に7行を維持。
- Hashing: `keccak256(toBytes(payload))`（**サーバー側のみ**）

## Repo
- https://github.com/moveq-memida/base-glitch-hunter-library

## Contract (Base mainnet)
- GlitchStamp: `0xb7EfCf8ad9367688F8bC57c1Bf364A510ff9B99A`
- Basescan: https://basescan.org/address/0xb7EfCf8ad9367688F8bC57c1Bf364A510ff9B99A
