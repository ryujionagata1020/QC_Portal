# AWS シンプル構成 デプロイ手順書

## アーキテクチャ概要

```
Internet → Route 53 → CloudFront → ALB → EC2 (Node.js) → RDS MySQL
```

**月額コスト目安**: $30〜50

---

## 前提条件

- AWSアカウント作成済み
- AWS CLIインストール済み（オプション）
- 独自ドメイン（オプション、Route 53で取得可）

---

## Step 1: VPC の作成

1. **VPCコンソール** → 「VPCを作成」
2. 設定:
   - 名前: `qc-portal-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - 「VPCなど」を選択（サブネット自動作成）
   - AZ数: 2
   - パブリックサブネット: 2
   - プライベートサブネット: 2
   - NAT Gateway: なし（コスト削減）
   - VPCエンドポイント: なし

---

## Step 2: セキュリティグループの作成

### 2-1. ALB用セキュリティグループ

| 名前 | `qc-portal-alb-sg` |
|------|-------------------|
| インバウンド | HTTP (80) - 0.0.0.0/0 |
| インバウンド | HTTPS (443) - 0.0.0.0/0 |
| アウトバウンド | すべて許可 |

### 2-2. EC2用セキュリティグループ

| 名前 | `qc-portal-ec2-sg` |
|------|-------------------|
| インバウンド | TCP 3000 - ALB-SGから |
| インバウンド | SSH (22) - 自分のIPのみ |
| アウトバウンド | すべて許可 |

### 2-3. RDS用セキュリティグループ

| 名前 | `qc-portal-rds-sg` |
|------|-------------------|
| インバウンド | MySQL (3306) - EC2-SGから |
| アウトバウンド | すべて許可 |

---

## Step 3: RDS MySQL の作成

1. **RDSコンソール** → 「データベースを作成」
2. 設定:
   - エンジン: MySQL 8.0
   - テンプレート: **無料利用枠** または **開発/テスト**
   - DBインスタンス識別子: `qc-portal-db`
   - マスターユーザー名: `admin`
   - マスターパスワード: （安全なパスワードを設定）
   - インスタンスクラス: `db.t3.micro`
   - ストレージ: 20GB gp2
   - VPC: `qc-portal-vpc`
   - パブリックアクセス: **いいえ**
   - セキュリティグループ: `qc-portal-rds-sg`
   - 初期データベース名: `qc_portal`

3. 作成後、**エンドポイント**をメモ（例: `qc-portal-db.xxxx.ap-northeast-1.rds.amazonaws.com`）

---

## Step 4: EC2 インスタンスの作成

1. **EC2コンソール** → 「インスタンスを起動」
2. 設定:
   - 名前: `qc-portal-app`
   - AMI: **Amazon Linux 2023**
   - インスタンスタイプ: `t3.small`（または `t3.micro`）
   - キーペア: 新規作成または既存を選択
   - VPC: `qc-portal-vpc`
   - サブネット: パブリックサブネット
   - パブリックIP自動割り当て: **有効**
   - セキュリティグループ: `qc-portal-ec2-sg`
   - ストレージ: 8GB gp3

3. **ユーザーデータ**（高度な詳細）に以下を貼り付け:

```bash
#!/bin/bash
yum update -y
yum install -y git nodejs npm

# PM2インストール
npm install -g pm2

# アプリディレクトリ作成
mkdir -p /var/www/qc-portal
chown ec2-user:ec2-user /var/www/qc-portal
```

---

## Step 5: EC2 へのデプロイ

### 5-1. SSH接続

```bash
ssh -i "your-key.pem" ec2-user@<EC2のパブリックIP>
```

### 5-2. アプリケーションのデプロイ

```bash
cd /var/www/qc-portal

# GitHubからクローン
git clone https://github.com/ryujionagata1020/QC_Portal.git .

# 依存関係インストール
npm install --production

# 環境変数ファイル作成
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

# RDS設定（実際の値に置き換え）
MYSQL_HOST=qc-portal-db.xxxx.ap-northeast-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USERNAME=admin
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=qc_portal
MYSQL_CONNECTION_LIMIT=10

# セッションシークレット（ランダム文字列を生成）
SESSION_SECRET=your-random-secret-key-here
EOF

# PM2で起動
pm2 start app.js --name qc-portal
pm2 save
pm2 startup
```

### 5-3. データベースの初期化

RDSにテーブルを作成する必要があります。EC2からMySQLに接続:

```bash
# MySQL クライアントインストール
sudo yum install -y mariadb105

# RDSに接続
mysql -h qc-portal-db.xxxx.ap-northeast-1.rds.amazonaws.com -u admin -p qc_portal

# テーブル作成SQLを実行（プロジェクトのスキーマファイルを使用）
```

---

## Step 6: ALB（ロードバランサー）の作成

1. **EC2コンソール** → ロードバランサー → 「ロードバランサーを作成」
2. タイプ: **Application Load Balancer**
3. 設定:
   - 名前: `qc-portal-alb`
   - スキーム: インターネット向け
   - VPC: `qc-portal-vpc`
   - サブネット: パブリックサブネット2つ選択
   - セキュリティグループ: `qc-portal-alb-sg`

4. ターゲットグループ作成:
   - 名前: `qc-portal-tg`
   - ターゲットタイプ: インスタンス
   - プロトコル: HTTP
   - ポート: 3000
   - ヘルスチェックパス: `/`
   - ターゲット: EC2インスタンスを登録

5. リスナー:
   - HTTP:80 → ターゲットグループへ転送

---

## Step 7: HTTPS の設定（推奨）

### 7-1. ACM で証明書を取得

1. **ACMコンソール** → 「証明書をリクエスト」
2. ドメイン名を入力（例: `qc-portal.example.com`）
3. DNS検証を選択
4. Route 53でCNAMEレコードを作成

### 7-2. ALB に HTTPS リスナーを追加

1. ALBのリスナータブ → 「リスナーを追加」
2. HTTPS:443 → ターゲットグループへ転送
3. 証明書: ACMで作成した証明書を選択

### 7-3. HTTP → HTTPS リダイレクト

1. HTTP:80のリスナーを編集
2. アクション: リダイレクト先 → HTTPS:443

---

## Step 8: CloudFront の設定（オプション）

静的ファイルのキャッシュとグローバル配信用:

1. **CloudFrontコンソール** → 「ディストリビューションを作成」
2. オリジン: ALBのDNS名
3. キャッシュ動作:
   - `/public/*` → キャッシュ有効（TTL: 86400秒）
   - `/*` → キャッシュ無効（動的コンテンツ）

---

## Step 9: Route 53 の設定（オプション）

1. ホストゾーン作成（ドメインがRoute 53にない場合）
2. Aレコード作成:
   - レコード名: `qc-portal`（または空白でルートドメイン）
   - エイリアス: はい
   - ターゲット: ALB（またはCloudFront）

---

## 運用・保守

### ログの確認

```bash
# アプリケーションログ
pm2 logs qc-portal

# リアルタイムログ
pm2 logs qc-portal --lines 100
```

### アプリケーションの更新

```bash
cd /var/www/qc-portal
git pull origin master
npm install --production
pm2 restart qc-portal
```

### PM2コマンド

```bash
pm2 status          # ステータス確認
pm2 restart all     # 再起動
pm2 stop all        # 停止
pm2 monit           # モニタリング
```

---

## セキュリティチェックリスト

- [ ] RDSはプライベートサブネットに配置
- [ ] EC2のSSHは自分のIPのみ許可
- [ ] 本番環境で `secure: true` に変更
- [ ] SESSION_SECRETは十分な長さのランダム文字列
- [ ] MySQLパスワードは強固なものを使用
- [ ] 定期的なセキュリティアップデート実施

---

## トラブルシューティング

### EC2からRDSに接続できない

1. セキュリティグループの確認
2. RDSがプライベートサブネットにあるか確認
3. VPCのルートテーブル確認

### アプリケーションが起動しない

```bash
pm2 logs qc-portal --err
cat /var/www/qc-portal/.env  # 環境変数確認
```

### ヘルスチェックが失敗する

1. EC2でアプリが動作しているか確認: `curl localhost:3000`
2. セキュリティグループでポート3000が開いているか確認
