# Amazon Lightsail デプロイ手順書

**対象プロジェクト:** QC Portal
**構成:** Node.js / Express / MySQL / EJS
**作成日:** 2026-02-25

---

## 目次

1. [Lightsail インスタンス作成](#1-lightsail-インスタンス作成)
2. [初期サーバー設定](#2-初期サーバー設定)
3. [Node.js インストール](#3-nodejs-インストール)
4. [MySQL セットアップ](#4-mysql-セットアップ)
5. [アプリケーションのデプロイ](#5-アプリケーションのデプロイ)
6. [環境変数の設定](#6-環境変数の設定)
7. [データベース初期化](#7-データベース初期化)
8. [PM2 によるプロセス管理](#8-pm2-によるプロセス管理)
9. [Nginx リバースプロキシ設定](#9-nginx-リバースプロキシ設定)
10. [SSL/HTTPS 設定（Let's Encrypt）](#10-sslhttps-設定lets-encrypt)
11. [ファイアウォール設定](#11-ファイアウォール設定)
12. [動作確認](#12-動作確認)
13. [更新デプロイ手順](#13-更新デプロイ手順)
14. [トラブルシューティング](#14-トラブルシューティング)

---

## 環境情報

| 項目 | 値 |
|---|---|
| Static IP | `54.250.133.123` |
| ドメイン | `qc-portals.com` |
| アプリパス | `/var/www/qc-portal/` |
| Node ポート | `3000` |
| MySQL ユーザー | `qcuser` |
| MySQL DB | `qc_portal` |
| GitHub リポジトリ | `https://github.com/ryujionagata1020/QC_Portal.git` |

---

## 1. Lightsail インスタンス作成

### 1-1. AWSコンソールでの作成

1. [Amazon Lightsail](https://lightsail.aws.amazon.com/) にログイン
2. **「インスタンスの作成」** をクリック
3. 以下を選択:
   - **リージョン:** 東京 (`ap-northeast-1`)
   - **OS:** Ubuntu 22.04 LTS
   - **プラン:** $10/月以上（RAM 2GB）を推奨
4. **インスタンス名:** `qc-portal`
5. **「インスタンスの作成」** をクリック

### 1-2. 静的 IP のアタッチ

1. Lightsail コンソール → **「ネットワーキング」**
2. **「静的 IP の作成」** → リージョン: 東京
3. 作成したインスタンス `qc-portal` にアタッチ
4. IP が `54.250.133.123` になることを確認

### 1-3. SSH キーのダウンロード

Lightsail コンソール → **「アカウント」→「SSH キー」** からデフォルトキーをダウンロード。

```bash
# ローカルPC から接続テスト
chmod 400 ~/Downloads/LightsailDefaultKey-ap-northeast-1.pem
ssh -i ~/Downloads/LightsailDefaultKey-ap-northeast-1.pem ubuntu@54.250.133.123
```

---

## 2. 初期サーバー設定

SSH でサーバーに接続後、以下を実行。

```bash
# パッケージ更新
sudo apt update && sudo apt upgrade -y

# 必要ツールのインストール
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx

# タイムゾーンを日本時間に設定
sudo timedatectl set-timezone Asia/Tokyo
timedatectl  # 確認
```

---

## 3. Node.js インストール

**Node.js 20 LTS** を使用（nvm 経由で管理）。

```bash
# nvm インストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# シェルに反映
source ~/.bashrc

# Node.js 20 LTS インストール
nvm install 20
nvm use 20
nvm alias default 20

# バージョン確認
node -v   # v20.x.x
npm -v    # 10.x.x

# PM2 グローバルインストール
npm install -g pm2
```

---

## 4. MySQL セットアップ

### 4-1. MySQL インストール

```bash
sudo apt install -y mysql-server

# 起動と自動起動設定
sudo systemctl start mysql
sudo systemctl enable mysql

# セキュリティ初期設定
sudo mysql_secure_installation
# 以下に答える:
#   VALIDATE PASSWORD plugin: No（または任意）
#   root パスワード設定: 任意の強力なパスワード
#   Remove anonymous users: Yes
#   Disallow root login remotely: Yes
#   Remove test database: Yes
#   Reload privilege tables: Yes
```

### 4-2. データベースとユーザー作成

```bash
sudo mysql -u root -p
```

MySQL プロンプトで実行:

```sql
-- データベース作成
CREATE DATABASE qc_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ユーザー作成
CREATE USER 'qcuser'@'localhost' IDENTIFIED BY '【強力なパスワード】';

-- 権限付与
GRANT ALL PRIVILEGES ON qc_portal.* TO 'qcuser'@'localhost';
FLUSH PRIVILEGES;

-- 確認
SHOW DATABASES;
SELECT User, Host FROM mysql.user;

EXIT;
```

---

## 5. アプリケーションのデプロイ

### 5-1. ディレクトリ作成

```bash
sudo mkdir -p /var/www/qc-portal
sudo chown ubuntu:ubuntu /var/www/qc-portal
```

### 5-2. GitHub からクローン

```bash
cd /var/www
git clone https://github.com/ryujionagata1020/QC_Portal.git qc-portal
cd qc-portal

# ブランチ確認
git branch -a
git checkout master  # メインブランチ
```

### 5-3. 依存パッケージインストール

```bash
cd /var/www/qc-portal
npm install --omit=dev
```

---

## 6. 環境変数の設定

`.env` ファイルはGitに含まれないため、**サーバー上で直接作成** する。

```bash
nano /var/www/qc-portal/.env
```

以下の内容を記述（値は実際のものに置き換える）:

```env
# アプリケーション設定
NODE_ENV=production
PORT=3000
APP_URL=https://qc-portals.com

# セッション（64文字以上のランダム文字列）
SESSION_SECRET=【openssl rand -base64 64 で生成した文字列】

# MySQL 接続情報
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=qcuser
MYSQL_PASSWORD=【MySQL ユーザー作成時のパスワード】
MYSQL_DATABASE=qc_portal
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0

# Gmail SMTP（メール送信）
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=【Gmailアドレス】
MAIL_PASS=【Gmailアプリパスワード】
MAIL_FROM=noreply@qc-portals.com
```

**SESSION_SECRET の生成:**

```bash
openssl rand -base64 64
# 出力された文字列を SESSION_SECRET に貼り付ける
```

**Gmail アプリパスワードの取得:**
1. Google アカウント → セキュリティ → 2段階認証を有効化
2. 「アプリパスワード」→ アプリ:「メール」、デバイス:「その他」
3. 生成された16文字のパスワードを `MAIL_PASS` に設定

```bash
# ファイルのパーミッションを制限
chmod 600 /var/www/qc-portal/.env
```

---

## 7. データベース初期化

### 7-1. スキーマの適用

```bash
# スキーマファイルがある場合
mysql -u qcuser -p qc_portal < /var/www/qc-portal/data/schema.sql

# または個別に適用
mysql -u qcuser -p qc_portal
```

### 7-2. `contact_inquiries` テーブルの手動作成

> **注意:** このテーブルはスキーマファイルに含まれていないため手動で作成する。

```bash
mysql -u qcuser -p qc_portal
```

```sql
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7-3. テーブル確認

```sql
USE qc_portal;
SHOW TABLES;
EXIT;
```

---

## 8. PM2 によるプロセス管理

### 8-1. アプリケーション起動

```bash
cd /var/www/qc-portal
pm2 start app.js --name qc-portal --env production
```

### 8-2. 自動起動設定

```bash
# PM2 のスタートアップスクリプト生成
pm2 startup

# 表示されたコマンドを実行（例）
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.x.x/bin \
  /home/ubuntu/.nvm/versions/node/v20.x.x/lib/node_modules/pm2/bin/pm2 \
  startup systemd -u ubuntu --hp /home/ubuntu

# 現在の状態を保存
pm2 save
```

### 8-3. 動作確認コマンド

```bash
pm2 list              # 起動中のプロセス一覧
pm2 logs qc-portal    # ログ確認
pm2 status            # 詳細ステータス

# アプリが正常に起動しているか確認
curl http://localhost:3000
```

---

## 9. Nginx リバースプロキシ設定

### 9-1. 設定ファイル作成

```bash
sudo nano /etc/nginx/sites-available/qc-portal
```

以下を記述:

```nginx
server {
    listen 80;
    server_name qc-portals.com www.qc-portals.com;

    # アクセスログ
    access_log /var/log/nginx/qc-portal-access.log;
    error_log  /var/log/nginx/qc-portal-error.log;

    # アップロードサイズ上限
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9-2. 設定の有効化

```bash
# シンボリックリンク作成
sudo ln -s /etc/nginx/sites-available/qc-portal /etc/nginx/sites-enabled/

# デフォルト設定の無効化（競合防止）
sudo rm -f /etc/nginx/sites-enabled/default

# 設定ファイルの文法チェック
sudo nginx -t

# Nginx 再起動
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 10. SSL/HTTPS 設定（Let's Encrypt）

> **前提:** ドメイン `qc-portals.com` の DNS A レコードが `54.250.133.123` を指していること。

### 10-1. DNS 設定の確認

```bash
nslookup qc-portals.com
# → 54.250.133.123 が返ってくればOK
```

### 10-2. 証明書の取得

```bash
sudo certbot --nginx -d qc-portals.com -d www.qc-portals.com \
  --email 【メールアドレス】 \
  --agree-tos \
  --redirect
```

### 10-3. 自動更新の確認

```bash
# 更新テスト
sudo certbot renew --dry-run

# 自動更新タイマーの確認
sudo systemctl status certbot.timer
```

certbot が Nginx 設定を自動更新し、HTTPS リダイレクトが設定される。

---

## 11. ファイアウォール設定

Lightsail コンソールでファイアウォールを設定する。

### Lightsail コンソールの設定

1. インスタンス `qc-portal` → **「ネットワーキング」**
2. **「ファイアウォールルールの追加」** で以下を許可:

| プロトコル | ポート | 説明 |
|---|---|---|
| TCP | 22 | SSH |
| TCP | 80 | HTTP |
| TCP | 443 | HTTPS |

> ポート 3000 は外部公開不要（Nginx 経由のみ）。

### UFW（サーバー側ファイアウォール）

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 12. 動作確認

```bash
# PM2 プロセス確認
pm2 list

# アプリログ確認
pm2 logs qc-portal --lines 50

# Nginx ステータス確認
sudo systemctl status nginx

# MySQL ステータス確認
sudo systemctl status mysql

# HTTPS アクセス確認
curl -I https://qc-portals.com
```

ブラウザで `https://qc-portals.com` にアクセスし、サイトが正常表示されることを確認。

---

## 13. 更新デプロイ手順

コードを更新する際は以下の手順で実施。

```bash
# アプリディレクトリに移動
cd /var/www/qc-portal

# 最新コードを取得
git pull origin master

# 依存パッケージ更新（package.json が変わった場合のみ）
npm install --omit=dev

# アプリを再起動
pm2 restart qc-portal

# 再起動後のログ確認
pm2 logs qc-portal --lines 30
```

> `.env` の変更後も `pm2 restart qc-portal` が必要。

---

## 14. トラブルシューティング

### アプリが起動しない

```bash
pm2 logs qc-portal --lines 100
# → エラーメッセージを確認

# .env の必須変数が設定されているか確認
cat /var/www/qc-portal/.env
```

### MySQL 接続エラー

```bash
# MySQL ステータス確認
sudo systemctl status mysql

# 接続テスト
mysql -u qcuser -p -h localhost qc_portal
```

### Nginx 502 Bad Gateway

```bash
# アプリが起動しているか確認
pm2 list
curl http://localhost:3000

# Nginx エラーログ確認
sudo tail -f /var/log/nginx/qc-portal-error.log
```

### SSL 証明書の手動更新

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### ログ確認まとめ

```bash
pm2 logs qc-portal                          # アプリログ
sudo tail -f /var/log/nginx/qc-portal-access.log  # Nginxアクセスログ
sudo tail -f /var/log/nginx/qc-portal-error.log   # Nginxエラーログ
sudo journalctl -u mysql -n 50              # MySQLログ
```

---

## 参考: よく使うコマンド

```bash
# アプリ再起動
pm2 restart qc-portal

# アプリ停止
pm2 stop qc-portal

# アプリ起動
pm2 start qc-portal

# Nginx 再起動
sudo systemctl restart nginx

# MySQL 再起動
sudo systemctl restart mysql

# ディスク使用量確認
df -h

# メモリ使用量確認
free -h
```
