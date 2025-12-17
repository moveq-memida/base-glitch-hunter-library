# Glitch Hunter Library

> 伝説のゲームバグを投稿して、みんなで投票。気に入った投稿はBaseに“刻める”。

## 概要

Glitch Hunter Library は、ゲームの「有名バグ／珍バグ」を投稿・閲覧・投票できる Base Mini App です。  
面白い投稿は “Onchain Stamp” で Base mainnet にハッシュだけを刻み、殿堂入りの“証拠”として残せます。

## デモ

- **アプリURL**: https://base-glitch-hunter-library.vercel.app
- **スライド**: （ここにGoogle SlidesのURL）
- **刻印済みの例（審査員向けショートカット）**: https://base-glitch-hunter-library.vercel.app/glitch/3
- **GlitchRegistry（投稿/投票）**: `0x7Dff70820aB282a49d9A19ca9b1715Ffaa7128F4`（Base mainnet / chainId 8453）
- **GlitchStamp（刻印）**: `0xb7EfCf8ad9367688F8bC57c1Bf364A510ff9B99A`（Base mainnet / chainId 8453）
- **刻印Tx例**: https://basescan.org/tx/0x597daf04533c33e723d1999a927878fcb77c6dea619722617e743cd41ac4febd

## 推しポイント

1. **5秒でわかるUI**
   - タイトル直下で「何ができるか」と「Baseを使う理由（刻印）」が分かるようにしています。
   - 一覧カードに「刻印済み」バッジが出るので、どれが殿堂入りか一目で追えます。

2. **Onchain Stamp（Base mainnet）**
   - 刻印でオンチェーンに残すのは「投稿の存在した証拠（bytes32ハッシュ）」だけです（本文や動画はオンチェーンに載せません）。
   - 画面上で「刻印済み」表示、Txリンク、stampHashのコピーができます。
   - stampHashは**必ずサーバー側**で生成します（改行区切り・順序固定で再現可能）。

   ```
   version=1
   title
   game
   videoUrl
   description
   createdAt(ISO)
   authorIdentifier
   ```

3. **投票もオンチェーン（ただし自動1票は無し）**
   - 投稿は `contentHash(bytes32)` をオンチェーン登録し、投票数はコントラクトの状態として持ちます。
   - 投稿しただけでは0票。自分の投稿でも、投票ボタンを押した分だけ票が入ります。

## 使用技術(もしこだわりがあれば)

- **フロントエンド**: Next.js (App Router), TypeScript
- **バックエンド**: Next.js Route Handlers / API
- **データベース**: PostgreSQL (Prisma)
- **インフラ**: Vercel
- **その他**: Base Mini App（farcaster.json）, viem / wagmi, Base mainnet (chainId 8453), BaseScan

## チームメンバー

- memi (solo dev) - @GitHub（moveq-memida）, @Discord（0x_memi）

---

*このプロジェクトは「12/13-20 大喜利.hack vibecoding mini hackathon」で作成されました*
