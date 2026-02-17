#!/bin/bash
# QC Portal - Lightsail ステージング環境セットアップスクリプト
# Ubuntu 22.04 LTS 用
# 使い方: sudo ./lightsail-setup.sh

set -e

# 変数設定
APP_DIR="/var/www/qc-portal"
REPO_URL="https://github.com/ryujionagata1020/QC_Portal.git"
BRANCH="master"
APP_USER="ubuntu"
NODE_MAJOR=20

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# root権限チェック
if [ "$EUID" -ne 0 ]; then
    print_error "root権限で実行してください: sudo $0"
    exit 1
fi

echo "=========================================="
echo "QC Portal - Lightsail Staging Setup"
echo "Ubuntu 22.04 LTS"
echo "=========================================="

# Step 1: システムアップデート
print_step "1/8 システムをアップデート中..."
apt update && apt upgrade -y

# Step 2: 基本パッケージのインストール
print_step "2/8 基本パッケージをインストール中..."
apt install -y curl git build-essential

# Step 3: Node.js 20 LTS インストール
print_step "3/8 Node.js ${NODE_MAJOR} LTS をインストール中..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_MAJOR ]]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
    apt install -y nodejs
fi
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"

# Step 4: MySQL 8.0 インストール
print_step "4/8 MySQL 8.0 をインストール中..."
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql

    # MySQL セキュリティ設定（rootパスワードなし、ソケット認証のまま）
    # 本番環境では mysql_secure_installation を実行すること
    mysql -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
else
    print_warning "MySQLは既にインストール済みです"
fi
echo "  MySQL: $(mysql --version)"

# Step 5: PM2 インストール
print_step "5/8 PM2 をインストール中..."
npm install -g pm2

# Step 6: アプリケーションのクローン
print_step "6/8 アプリケーションをセットアップ中..."
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

if [ -d "$APP_DIR/.git" ]; then
    print_warning "既存のリポジトリが見つかりました。プルします..."
    su - $APP_USER -c "cd $APP_DIR && git pull origin $BRANCH"
else
    su - $APP_USER -c "git clone $REPO_URL $APP_DIR"
    su - $APP_USER -c "cd $APP_DIR && git checkout $BRANCH"
fi

# 依存関係インストール
print_step "7/8 依存関係をインストール中..."
su - $APP_USER -c "cd $APP_DIR && npm install --production"

# Step 7: 設定ファイルの作成
print_step "8/8 設定ファイルを作成中..."

# .env テンプレート
if [ ! -f "$APP_DIR/.env" ]; then
    SESSION_SECRET=$(openssl rand -hex 32)
    cat > $APP_DIR/.env << EOF
# QC Portal ステージング環境設定
# このファイルを編集してください

NODE_ENV=staging
PORT=3000

# MySQL設定（ローカルMySQL）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=qcapp
MYSQL_PASSWORD=CHANGE_THIS_PASSWORD
MYSQL_DATABASE=qc_portal
MYSQL_CONNECTION_LIMIT=10

# セッションシークレット（自動生成済み）
SESSION_SECRET=${SESSION_SECRET}
EOF
    chown $APP_USER:$APP_USER $APP_DIR/.env
    chmod 600 $APP_DIR/.env
    print_warning ".env ファイルを作成しました。MySQLパスワードを編集してください。"
else
    print_warning ".env ファイルは既に存在します。スキップします。"
fi

# PM2 ecosystem.config.js
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'qc-portal',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'staging'
    },
    error_file: '/var/log/pm2/qc-portal-error.log',
    out_file: '/var/log/pm2/qc-portal-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.js

# ログディレクトリ
mkdir -p /var/log/pm2
chown $APP_USER:$APP_USER /var/log/pm2

# PM2 スタートアップ設定
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER

# スワップファイル追加（メモリ不足対策）
if [ ! -f /swapfile ]; then
    print_step "スワップファイルを作成中（1GB）..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "=========================================="
echo "セットアップ完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo ""
echo "1. MySQL データベースとユーザーを作成:"
echo "   sudo mysql"
echo "   CREATE DATABASE qc_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'qcapp'@'localhost' IDENTIFIED BY '安全なパスワード';"
echo "   GRANT ALL PRIVILEGES ON qc_portal.* TO 'qcapp'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "2. スキーマとデータを投入:"
echo "   mysql -u qcapp -p qc_portal < schema.sql"
echo ""
echo "3. .env ファイルを編集（MySQLパスワードを設定）:"
echo "   nano $APP_DIR/.env"
echo ""
echo "4. アプリケーションを起動:"
echo "   cd $APP_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "5. 動作確認:"
echo "   curl http://localhost:3000"
echo "   ブラウザ: http://<STATIC_IP>:3000"
echo ""
