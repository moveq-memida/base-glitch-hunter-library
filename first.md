あなたは 2025 年時点の Web3 フルスタックに詳しいシニアエンジニアです。
これから「Glitch Hunter Library」という dApp の実装を手伝ってください。

# プロジェクト概要

Glitch Hunter Library は、世界中の「ゲームのバグ・裏技・変な挙動（Glitch）」を
カードとして投稿・閲覧・投票できる Web アプリです。

- 各 Glitch は、タイトル / ゲーム名 / プラットフォーム / 動画URL / 説明 / タグ / vote 数 を持つ
- 投稿と upvote の一部を Base 上のスマートコントラクトで記録する
- UI はすでに静的 HTML + CSS として完成しており、それを Next.js コンポーネントに分解して利用したい

# すでにあるもの

- GitHub リポジトリ：`base-glitch-hunter-library`
- Next.js（App Router） + TypeScript プロジェクト（初期化済み）
- Gemini で生成した静的 UI（HTML + CSS）
  - 例：
    - `public/ui/glitch.css`
    - `public/ui/top.html`
    - `public/ui/submit.html`
    - `public/ui/detail.html`

※ 実際のファイルパスはコードを見て判断してください。

# やりたいこと（大きな流れ）

1. 静的 HTML + CSS を Next.js コンポーネントに分解
2. Solidity コントラクト（GlitchRegistry）を実装し、Hardhat でデプロイできるようにする
3. wagmi + viem でフロントとコントラクトをつなぐ
4. Next.js Route Handlers で簡単な API ＋ DB 連携を実装する

---

# 仕様（重要）

以下の仕様に沿って実装してください。

## ページ構成

- `/`  
  - 最新の Glitch をカード一覧で表示
- `/submit`  
  - Glitch 投稿フォーム
- `/glitch/[id]`  
  - Glitch の詳細表示ページ + upvote ボタン

## DB モデル（Glitch）

PostgreSQL を想定。O/RM は Prisma でも Drizzle でもよいです。

- `id` (string or number) – 内部 ID
- `title` (string)
- `game_name` (string)
- `platform` (string)
- `video_url` (string)
- `description` (text)
- `tags` (string)  // カンマ区切りでOK
- `author_address` (string)
- `onchain_glitch_id` (number)
- `content_hash` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## API エンドポイント

Next.js の Route Handlers で以下を実装してください。

- `GET /api/glitches`
  - 最新から N 件（例：20件）を返す
- `POST /api/glitches`
  - Body: 上の Glitch メタデータ + `onchain_glitch_id` + `content_hash`
  - DB に保存
- `GET /api/glitches/[id]`
  - 1件の Glitch レコードを返す

vote 数は、MVP では onchain の `voteCount` を直接読んで表示するだけで構いません。

---

## スマートコントラクト仕様（GlitchRegistry）

Network: Base Sepolia → Base mainnet

```solidity
struct Glitch {
    address author;
    bytes32 contentHash;
    uint256 createdAt;
}

mapping(uint256 => Glitch) public glitches;
uint256 public nextGlitchId;

mapping(uint256 => mapping(address => bool)) public hasVoted;
mapping(uint256 => uint256) public voteCount;
関数
function submitGlitch(bytes32 contentHash) external returns (uint256 glitchId);

glitchId = nextGlitchId

glitches[glitchId] = Glitch(msg.sender, contentHash, block.timestamp)

nextGlitchId++

emit GlitchSubmitted(glitchId, msg.sender, contentHash);

function upvote(uint256 glitchId) external;

require(glitchId < nextGlitchId, "invalid glitch");

require(!hasVoted[glitchId][msg.sender], "already voted");

hasVoted[glitchId][msg.sender] = true;

voteCount[glitchId] += 1;

emit GlitchUpvoted(glitchId, msg.sender);

function getGlitch(uint256 glitchId) external view returns (Glitch memory);

function getVoteCount(uint256 glitchId) external view returns (uint256);

イベント
solidity
コードをコピーする
event GlitchSubmitted(uint256 indexed glitchId, address indexed author, bytes32 contentHash);
event GlitchUpvoted(uint256 indexed glitchId, address indexed voter);
Hardhat プロジェクトを contracts ディレクトリ配下に作成し、

hardhat.config.ts

contracts/GlitchRegistry.sol

scripts/deploy.ts

test/glitchRegistry.test.ts

を用意してください。Base Sepolia ネットワーク設定は .env から RPC URL と秘密鍵を読むようにしてください。

フロントエンド実装の詳細
1. 静的 UI → Next.js コンポーネント
現在の HTML + CSS をベースに、

app/page.tsx → Top ページ

app/submit/page.tsx → Submit ページ

app/glitch/[id]/page.tsx → Detail ページ
にコンポーネント化してください。

共通パーツ（ヘッダー、フッター、カードなど）は components/ 以下に切り出してください。

例：Header.tsx, Footer.tsx, GlitchCard.tsx など

既存の CSS（glitch.css）は、app/layout.tsx から読み込むようにしてください。

2. wagmi + viem
wagmi + viem をセットアップし、

ウォレット接続（MetaMask 等）

Base Sepolia / Base mainnet を扱えるようにしてください。

/submit ページ：

フォーム送信時にメタデータ JSON を作成

contentHash = keccak256(UTF8 JSON string) を計算

submitGlitch(contentHash) を writeContract で呼び出す

TX 成功後、/api/glitches に POST して DB 保存

保存された id を使って /glitch/[id] へ遷移

/glitch/[id] ページ：

GET /api/glitches/[id] でメタデータ取得

getVoteCount を readContract で取得して表示（MVPではクライアントサイドでOK）

Upvote ボタンで upvote(glitchId) を呼び出す

成功後に vote 数を再取得

DX / README
README.md に以下を追記してください：

セットアップ手順

必要な環境変数一覧（DB URL, Base RPC URL, デプロイ用秘密鍵など）

ハードハットでのコントラクトデプロイコマンド

Next.js の開発サーバ起動方法

TypeScript の型エラーが出ないように注意してください。

エラー時には最低限のユーザー向けメッセージを表示してください。

例：「ウォレット接続に失敗しました」「トランザクションがキャンセルされました」など

あなたへのお願い
まず、既存の HTML/CSS を確認し、Next.js のページ／コンポーネントの構成案をテキストで提案してください。

その後、ファイルごとにコードを実装してください。

例：app/page.tsx → app/submit/page.tsx → contracts/GlitchRegistry.sol → app/api/** の順番など

一度にすべてを書き切れない場合は、「ここまで実装した」「次はここを実装する」という形で段階的に進めてください。

この仕様に沿って、base-glitch-hunter-library を完成に近づけるコードを提案してください。