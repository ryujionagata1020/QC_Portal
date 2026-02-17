# ダークモード実装ドキュメント

## 概要

QC_Portalにダークモード機能を実装しました。ユーザーはナビゲーションバーのボタンをクリックするだけで、ライトモードとダークモードを瞬時に切り替えることができます。

## 実装の特徴

### 1. CSS変数ベースの設計

- **103個のCSS変数**を定義し、サイト全体の色を一元管理
- **666箇所**の色参照をCSS変数に変換
- 元々6,095行だったCSSファイルは6,407行に拡張

### 2. テーマシステム

#### ライトテーマ（デフォルト）
```css
:root {
  --color-bg-body: #fafafa;
  --color-text-primary: #333;
  --color-brand: #8b6ccf;
  /* ... 103個の変数 ... */
}
```

#### ダークテーマ
```css
[data-theme="dark"] {
  --color-bg-body: #1a1a1a;
  --color-text-primary: #e0e0e0;
  --color-brand: #a48cef;
  /* ... 103個の変数 ... */
}
```

### 3. 主要なカラーカテゴリ

1. **ベースカラー** (6変数)
   - 背景色、コンテナ背景、セクション背景など

2. **テキストカラー** (6変数)
   - プライマリ、セカンダリ、ターシャリ、ミュート、ライトなど

3. **ブランドカラー (紫系)** (13変数)
   - メインブランドカラーとその明度バリエーション

4. **ステータスカラー**
   - **成功 (緑系)**: 11変数
   - **エラー (赤系)**: 11変数
   - **警告 (オレンジ系)**: 10変数
   - **情報 (青系)**: 10変数

5. **グレースケール** (10変数)
   - gray-50からgray-900までの段階的なグレー

6. **ナビバー・フッター** (7変数)
   - ナビゲーションバーとフッター専用の色

7. **その他**
   - ボーダー、黄色系、紫バリエーションなど

## ファイル変更

### 1. CSS (`public/index.css`)

#### 追加内容
- ファイル先頭にCSS変数定義を追加（268行）
- テーマボタンのスタイル定義（`.theme-toggle-btn`, `.theme-icon`）
- レスポンシブデザインでのテーマボタンスタイル調整

#### 変換内容
- 全6,095行のCSSで使用されていた色値をCSS変数参照に置換
- 例: `#8b6ccf` → `var(--color-brand)` (98箇所)
- 例: `#333` → `var(--color-text-primary)` (33箇所)

### 2. ナビバー (`views/_share/navbar.ejs`)

#### 追加内容
- テーマ切り替えボタン（認証済み/未認証両方に配置）
```html
<button class="theme-toggle-btn" onclick="toggleTheme()" title="ダークモード切替">
  <span class="theme-icon">🌙</span>
</button>
```

#### JavaScript機能
- `initTheme()`: ページ読み込み時にlocalStorageからテーマを復元
- `toggleTheme()`: テーマを切り替えてlocalStorageに保存
- `updateThemeIcon()`: アイコン表示を更新（🌙 / ☀️）

### 3. ドキュメント

- `docs/architecture.md`: アーキテクチャ説明にダークモード実装の詳細を追加
- `docs/functional-design.md`: 機能設計書にダークモード機能を追加
- `docs/dark-mode-implementation.md`: このドキュメント（実装の詳細を記載）

## テーマ切り替えの動作

### 1. ページ読み込み時
```javascript
(function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
})();
```

### 2. ボタンクリック時
```javascript
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}
```

### 3. アイコン更新
```javascript
function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(icon => {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}
```

## レスポンシブデザイン

### デスクトップ (> 768px)
- テーマボタンは40×40pxの円形ボタン
- ユーザーメニュー内に水平配置

### タブレット (≤ 768px)
- テーマボタンは35×35pxに縮小
- アイコンサイズも16pxに調整

### モバイル (≤ 480px)
- ユーザーメニューが固定配置（vertical layout）
- テーマボタンは2番目に表示（アカウントボタンの下）
- 順序: アカウント → テーマ → ログアウト

## 対象となるUI要素

ダークモードは以下のすべての要素に適用されます：

1. **ページ全体**
   - 背景色、テキスト色

2. **ナビゲーションバー**
   - 背景、リンク、ボーダー

3. **コンテナ・カード**
   - 背景、ボーダー、シャドウ

4. **ボタン**
   - ブランドボタン、二次ボタン、ログアウトボタン

5. **フォーム**
   - 入力フィールド、セレクトボックス、テキストエリア

6. **モーダル**
   - アカウントモーダル、認証モーダル

7. **テーブル**
   - 解答履歴テーブル、統計テーブル

8. **問題表示**
   - 問題本文、選択肢、解説

9. **ツール画面**
   - 検定シミュレーション、管理図シミュレーター、分布ファミリーマップ

10. **フッター**
    - 背景、リンク、テキスト

## パフォーマンスへの影響

- **CSS変数の参照**: ブラウザのネイティブ機能であり、パフォーマンスへの影響は最小限
- **テーマ切り替え**: DOM属性の変更のみで、再描画は必要な部分のみ
- **localStorage**: 同期的な操作だが、データ量が小さいため影響なし

## ブラウザ互換性

- **CSS変数**: IE11を除く全モダンブラウザでサポート
- **localStorage**: 全ブラウザでサポート
- **data属性**: 全ブラウザでサポート

## 今後の拡張可能性

1. **システムテーマ連動**
   ```javascript
   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   const defaultTheme = prefersDark ? 'dark' : 'light';
   ```

2. **追加テーマ**
   - ハイコントラストモード
   - セピアモード
   - カスタムカラーテーマ

3. **アニメーション**
   - テーマ切り替え時のスムーズトランジション
   ```css
   * {
     transition: background-color 0.3s, color 0.3s, border-color 0.3s;
   }
   ```

4. **ユーザープロファイル連動**
   - 認証済みユーザーのテーマ設定をデータベースに保存
   - デバイス間でテーマを同期

## メンテナンス

### 新しい色を追加する場合

1. **CSS変数を定義**
   ```css
   :root {
     --color-new-feature: #new-light-color;
   }

   [data-theme="dark"] {
     --color-new-feature: #new-dark-color;
   }
   ```

2. **使用する**
   ```css
   .new-feature {
     color: var(--color-new-feature);
   }
   ```

### 既存の色を変更する場合

- CSS変数の定義のみを変更すれば、すべての参照箇所に反映される
- ハードコードされた色値を探す必要なし

## 検証スクリプト

実装の正しさを確認するために検証スクリプトを用意しています：

```bash
node scripts/verify-dark-mode.js
```

このスクリプトは以下をチェックします：
- CSS変数の定義
- テーマボタンの存在
- JavaScript関数の定義
- スタイルの定義
- localStorage使用の確認
- レスポンシブスタイルの確認

## 自動変換スクリプト

CSS変数化を行ったPythonスクリプトも保存されています：

```bash
python scripts/css-dark-mode-converter.py
```

このスクリプトは：
- 6,095行のCSSを解析
- 664箇所の色値を検出
- 95種類のCSS変数に変換
- 新しいCSSファイルを生成

## まとめ

QC_Portalのダークモード実装は、以下の特徴を持つ堅牢で保守性の高い実装です：

- ✅ **包括的**: 全6,407行のCSSをカバー
- ✅ **一貫性**: 103個のCSS変数で統一的な色管理
- ✅ **パフォーマンス**: ネイティブCSS機能による高速動作
- ✅ **永続性**: localStorageによるテーマ記憶
- ✅ **レスポンシブ**: 全デバイスサイズに対応
- ✅ **アクセシビリティ**: 視認性を考慮した配色
- ✅ **拡張性**: 新しいテーマ追加が容易

ユーザーは、ナビゲーションバーのボタンをクリックするだけで、快適なダークモード体験を楽しむことができます。
