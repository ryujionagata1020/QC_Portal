#!/bin/bash
# QC Portal - EC2 セットアップスクリプト
# Amazon Linux 2023 用

set -e

echo "=========================================="
echo "QC Portal - EC2 Setup Script"
echo "=========================================="

# 変数設定（デプロイ前に編集）
APP_DIR="/var/www/qc-portal"
REPO_URL="https://github.com/ryujionagata1020/QC_Portal.git"
BRANCH="master"

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: システムアップデート
print_step "システムをアップデート中..."
sudo yum update -y

# Step 2: Node.js インストール
print_step "Node.js をインストール中..."
sudo yum install -y nodejs npm git

# Node.jsバージョン確認
node -v
npm -v

# Step 3: PM2 インストール
print_step "PM2 をインストール中..."
sudo npm install -g pm2

# Step 4: アプリケーションディレクトリ作成
print_step "アプリケーションディレクトリを作成中..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Step 5: アプリケーションのクローン
print_step "アプリケーションをクローン中..."
if [ -d "$APP_DIR/.git" ]; then
    print_warning "既存のリポジトリが見つかりました。プルします..."
    cd $APP_DIR
    git pull origin $BRANCH
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    git checkout $BRANCH
fi

# Step 6: 依存関係インストール
print_step "依存関係をインストール中..."
cd $APP_DIR
npm install --production

# Step 7: 環境変数ファイルの確認
print_step "環境変数ファイルを確認中..."
if [ ! -f "$APP_DIR/.env" ]; then
    print_warning ".env ファイルが見つかりません。テンプレートを作成します..."
    cat > $APP_DIR/.env << 'EOF'
# QC Portal 環境変数設定
# このファイルを編集してください

NODE_ENV=production
PORT=3000

# RDS MySQL 設定
MYSQL_HOST=your-rds-endpoint.ap-northeast-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USERNAME=admin
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=qc_portal
MYSQL_CONNECTION_LIMIT=10

# セッションシークレット（以下のコマンドで生成可能）
# openssl rand -hex 32
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_STRING
EOF
    echo ""
    print_warning "重要: .env ファイルを編集してください！"
    print_warning "  nano $APP_DIR/.env"
    echo ""
fi

# Step 8: PM2 設定ファイル作成
print_step "PM2設定ファイルを作成中..."
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
      NODE_ENV: 'production'
    },
    error_file: '/var/log/pm2/qc-portal-error.log',
    out_file: '/var/log/pm2/qc-portal-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# ログディレクトリ作成
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Step 9: PM2 スタートアップ設定
print_step "PM2スタートアップを設定中..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo ""
echo "=========================================="
echo "セットアップ完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. .env ファイルを編集:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. アプリケーションを起動:"
echo "   cd $APP_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "3. 動作確認:"
echo "   curl http://localhost:3000"
echo ""
echo "4. ログ確認:"
echo "   pm2 logs qc-portal"
echo ""
