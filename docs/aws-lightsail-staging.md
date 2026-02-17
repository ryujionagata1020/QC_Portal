# AWS Lightsail ステージング環境 構築手順書

## アーキテクチャ概要

```
Internet → Lightsail Static IP → Lightsail Instance (Ubuntu 22.04 / 2GB)
                                     ├── Node.js 20 LTS (PM2)
                                     └── MySQL 8.0 (localhost)
```

**月額コスト**: $10（インスタンス） + $0（静的IP使用中は無料） = **約$10/月**

---

## 前提条件

- AWSアカウント作成済み
- ローカルにSSHクライアントあり（Windows: PowerShell / Git Bash）

---

## Step 1: Lightsail インスタンスの作成

1. [Lightsail コンソール](https://lightsail.aws.amazon.com/) にアクセス
2. 「インスタンスの作成」をクリック
3. 設定:
   - **リージョン**: 東京 (`ap-northeast-1`)
   - **プラットフォーム**: Linux/Unix
   - **ブループリント**: 「OSのみ」→ **Ubuntu 22.04 LTS**
   - **インスタンスプラン**: $10/月（2GB RAM, 1 vCPU, 60GB SSD）
   - **インスタンス名**: `qc-portal-staging`
4. 「インスタンスの作成」をクリック

---

## Step 2: 静的IPの割り当て

1. Lightsailコンソール → 「ネットワーキング」タブ
2. 「静的IPの作成」をクリック
3. 設定:
   - **アタッチ先**: `qc-portal-staging`
   - **静的IP名**: `qc-portal-staging-ip`
4. 割り当てられたIPをメモ（以降 `<STATIC_IP>` と表記）

---

## Step 3: ファイアウォール設定

Lightsailコンソール → インスタンス → 「ネットワーキング」タブ → IPv4ファイアウォール:

| アプリケーション | プロトコル | ポート | ソース |
|-----------------|-----------|--------|--------|
| SSH | TCP | 22 | すべてのIPアドレス |
| カスタム | TCP | 3000 | すべてのIPアドレス |

> **注意**: ステージング環境なのでポート3000を直接公開する。本番環境ではNginxリバースプロキシ + ポート80/443を使用すること。

---

## Step 4: SSH接続

### 4-1. SSHキーのダウンロード

1. Lightsailコンソール → 「アカウント」→ 「SSHキー」
2. デフォルトキーをダウンロード（`LightsailDefaultKey-ap-northeast-1.pem`）

### 4-2. 接続

```bash
# 権限設定（初回のみ）
chmod 400 LightsailDefaultKey-ap-northeast-1.pem

# SSH接続
ssh -i LightsailDefaultKey-ap-northeast-1.pem ubuntu@<STATIC_IP>
```

Windows (PowerShell) の場合:
```powershell
ssh -i .\LightsailDefaultKey-ap-northeast-1.pem ubuntu@<STATIC_IP>
```

---

## Step 5: セットアップスクリプトの実行

SSH接続後、以下を実行:

```bash
# リポジトリをクローン
git clone https://github.com/ryujionagata1020/QC_Portal.git /tmp/qc-setup

# セットアップスクリプトを実行
chmod +x /tmp/qc-setup/scripts/lightsail-setup.sh
sudo /tmp/qc-setup/scripts/lightsail-setup.sh
```

スクリプトが行うこと:
1. システムアップデート
2. Node.js 20 LTS インストール
3. MySQL 8.0 インストール・設定
4. PM2 インストール
5. アプリケーションのクローンと依存関係インストール
6. `.env` テンプレート作成
7. PM2スタートアップ設定

---

## Step 6: MySQL データベースの初期化

### 6-1. MySQLに接続

```bash
sudo mysql
```

### 6-2. データベースとユーザーの作成

```sql
CREATE DATABASE IF NOT EXISTS qc_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'qcapp'@'localhost' IDENTIFIED BY 'ここに安全なパスワードを設定';

GRANT ALL PRIVILEGES ON qc_portal.* TO 'qcapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6-3. スキーマの投入

テーブル作成SQLを実行する。スキーマ定義は [docs/db_schema.md](db_schema.md) を参照。

```bash
mysql -u qcapp -p qc_portal < /path/to/schema.sql
```

### 6-4. テストデータの投入（任意）

問題データ等をインポートする場合:

```bash
mysql -u qcapp -p qc_portal < /path/to/seed-data.sql
```

---

## Step 7: 環境変数の設定

```bash
nano /var/www/qc-portal/.env
```

以下を実際の値に書き換える:

```env
NODE_ENV=staging
PORT=3000

# MySQL設定（Step 6で作成したユーザー情報）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=qcapp
MYSQL_PASSWORD=Step6で設定したパスワード
MYSQL_DATABASE=qc_portal
MYSQL_CONNECTION_LIMIT=10

# セッションシークレット（以下のコマンドで生成）
# openssl rand -hex 32
SESSION_SECRET=ここにランダム文字列
```

---

## Step 8: アプリケーションの起動

```bash
cd /var/www/qc-portal
pm2 start ecosystem.config.js
pm2 save
```

---

## Step 9: 動作確認

```bash
# ローカルで確認
curl -I http://localhost:3000

# ブラウザからアクセス
# http://<STATIC_IP>:3000
```

---

## 運用コマンド

### アプリケーション管理

```bash
pm2 status                    # ステータス確認
pm2 logs qc-portal            # ログ確認
pm2 restart qc-portal         # 再起動
pm2 stop qc-portal            # 停止
pm2 monit                     # リアルタイムモニタリング
```

### コード更新（手動デプロイ）

```bash
cd /var/www/qc-portal
git pull origin master
npm install --production
pm2 restart qc-portal
```

### MySQL管理

```bash
sudo systemctl status mysql   # MySQLステータス確認
sudo mysql                    # rootでログイン
mysql -u qcapp -p qc_portal  # アプリユーザーでログイン
```

### ディスク・メモリ確認

```bash
df -h                          # ディスク使用量
free -h                        # メモリ使用量
pm2 monit                     # アプリのメモリ使用量
```

---

## トラブルシューティング

### アプリが起動しない

```bash
pm2 logs qc-portal --err --lines 50
cat /var/www/qc-portal/.env    # 環境変数確認
node -e "require('dotenv').config(); console.log(process.env.MYSQL_HOST)"
```

### MySQLに接続できない

```bash
sudo systemctl status mysql    # MySQL稼働状態確認
sudo systemctl restart mysql   # MySQL再起動
sudo mysql -e "SELECT 1"      # 接続テスト
```

### ポート3000にアクセスできない

1. アプリが動作しているか: `pm2 status`
2. ポートがリッスンしているか: `ss -tlnp | grep 3000`
3. Lightsailファイアウォールでポート3000が開いているか確認

### メモリ不足

```bash
# スワップファイル追加（2GBプランでも安心）
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## セキュリティチェックリスト

- [ ] `.env` ファイルのパーミッション: `chmod 600 .env`
- [ ] MySQLのrootパスワード設定済み
- [ ] SESSION_SECRETは十分な長さのランダム文字列
- [ ] MySQLパスワードは強固なものを使用
- [ ] SSH鍵は安全に管理されている
- [ ] 不要なポートはファイアウォールで閉じている
- [ ] 定期的な `sudo apt update && sudo apt upgrade` を実施

---

## 本番環境との違い

| 項目 | 本番（EC2+RDS+ALB） | ステージング（Lightsail） |
|------|---------------------|--------------------------|
| コスト | $30〜50/月 | $10/月 |
| DB | RDS（マネージド） | 同一インスタンス内MySQL |
| LB | ALB | なし |
| HTTPS | ACM + ALB | なし（HTTP only） |
| バックアップ | RDS自動バックアップ | 手動 mysqldump |
| スケーリング | EC2 Auto Scaling可 | 手動プラン変更 |
| 管理 | 複数リソース | 1インスタンスで完結 |
