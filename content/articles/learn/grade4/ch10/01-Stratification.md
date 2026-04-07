---
title: 層別
grade: 4
chapter: 10
section: 1
chapter_title: 層別
question_category: SevenQCtools
prev: null
next: grade4/ch10/01-Stratification
published: true
---

**【データに隠された真因を見抜く「層別」完全解説】**

これまでの学習で、パレート図やヒストグラム、散布図といったさまざまな「QC七つ道具」の書き方や見方を学んできました。今回はそれらの図と組み合わせて使うことで絶大な威力を発揮する、少し特別なツール「**層別（そうべつ）**」について解説します。

品質管理の現場では、「**分けて、比べて、違いを見つけることが重要である**」と言われています。データ分析の要となる「層別」の考え方を整理し、問題の真の原因（真因）をピンポイントで見つけ出すスキルを身につけましょう！一通り学習したあとは、[試験対策問題](/questions/select?tab=custom&category=%E5%B1%A4%E5%88%A5)で力試ししてみましょう！

---

### 1. 層別とは何か？（定義と特徴）

「層別」とは、「**たくさんのデータを、そのデータのもつ特徴から、いくつかのグループ（層という）に分けること**」です。

私たちが現場でデータを集めるとき、それらのデータには必ず「いつ(When)」「どこで(Where)」「誰が(Who)」「どの機械で(What)」といった「**データの履歴（5W1H）**」がくっついています。
全体をひっくるめたデータ（母集団）をそのまま見ているだけでは見えなかった問題も、機械別や作業者別、性別など共通の要因ごとに細かく分けて（層別して）検討することで、真の原因が浮かび上がり、解決に役立ちます。

**💡 ここがポイント！層別は「図」ではなく「考え方」**
<br>
パレート図やヒストグラムが「図形」であるのに対し、層別は単独の図というよりも、 <strong>データを整理するための「考え方（作業）」</strong>です。
実は、JIS（日本産業規格）においてグラフと管理図を1つにまとめ、その代わりに「層別」を加えて「QC七つ道具」と呼ぶことも多くあります。

---

<div style="margin: 2em 0;">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-4841029986576213"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>

### 2. 要注意！「層別」と「分類」の違い

QC検定で非常によく出題され、多くの人が間違えやすいのが「層別」と「分類」の違いです。この2つは目的や方法が異なります。

*   **層別**：異常の**原因を探るため**に、母集団を特徴や履歴（5W1H）で分割すること。
    *   *例*：不良が多く発生している原因は機械の違いにあるのではないかと考え、「A号機」と「B号機」でデータを分ける。
*   **分類**：あらかじめ用意された**カテゴリー（基準）に従って**、試料を仕分けること。結果で分けている状態。
    *   *例*：出来上がった製品を外観の良し悪しによって、「A級品」「B級品」「C級品」に分ける。

試験では、「この行為は層別か、分類か？」を判断させる問題がよく出ます。**「原因（要因）を探るために分けているか」**を基準に判断してください。

---

<div style="margin: 2em 0;">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-4841029986576213"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>

### 3. 【図解】業界別で見る！層別の切り口（5W1H）

実際の現場で、どのような「切り口」で層別が行われているのか、製造業、飲食業、介護業の3つの業界の例を見てみましょう。

**【表1：業界別 層別の切り口と活用例】**

| 切り口（要因） | 🏭 製造業の例 | 🍽️ 飲食業の例 | 👵 介護業の例 |
| :--- | :--- | :--- | :--- |
| **人（作業者）別** | ベテラン作業員と新人作業員で不良率を比べる | ホールスタッフAさんとBさんでクレーム件数を比べる | 経験年数によって介助時の事故発生率を比べる |
| **機械・設備別** | 第1ラインと第2ラインで寸法データを比べる | ガスオーブンと電気オーブンで焼きムラを比べる | 1階フロアと2階フロアでヒヤリハット件数を比べる |
| **時間・期間別** | 午前と午後、または曜日ごとに不良の発生状況を比べる | ランチ帯とディナー帯で提供遅延の件数を比べる | 入浴時と食事時で転倒事故の発生頻度を比べる |
| **材料・部品別** | A社から仕入れた部品とB社の部品で強度を比べる | 産地の違う野菜で調理時間を比べる | メニューAとメニューBで食べ残しの量を比べる |

---

<div style="margin: 2em 0;">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-4841029986576213"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>

### 4. 他のQC七つ道具とのよくある組み合わせ

層別は、他のツールと組み合わせることが多いです。。代表的な2つの例を図解イメージとともに紹介します。

#### ① ヒストグラム × 層別

**【図1：層別したヒストグラムのイメージ】**
<div class="scatter-correlation-list">
  <div class="scatter-correlation-item">
    <img src="/public/images/articles/grade4/ch10/soubetuzentai.png" alt="全体のヒストグラム" />
    <p>全体のデータをヒストグラムにしたところ、山が2つある「二山形（ふたやまがた）」になりました。これは、平均値の異なる2つの分布が混ざっている状態です。</p>
  </div>
  <div class="scatter-correlation-item">
    <img src="/public/images/articles/grade4/ch10/soubetusoubetugo.png" alt="層別後のヒストグラム" />
    <p>そこで、使用した機械ごとに<strong>データを層別してグラフを2つに描き直した</strong>ところ、1号機と2号機で平均値に大きなズレがあることが判明し、それぞれの機械の調整を行うことができました。
</p>
  </div>
</div>

#### ② 散布図 × 層別

**【図2：層別した散布図のイメージ】**
<div class="scatter-correlation-list">
  <div class="scatter-correlation-item">
    <img src="/public/images/articles/grade4/ch10/soubetuzentai2.png" alt="全体のヒストグラム" />
    <p>2つのデータの関係を見る散布図を作成したところ、点が全体にバラバラに散らばっており、「相関関係なし（無相関）」に見えました。</p>
  </div>
  <div class="scatter-correlation-item">
    <img src="/public/images/articles/grade4/ch10/soubetusoubetugo2.png" alt="層別後のヒストグラム" />
    <p>しかし、<strong>データを群Aさん（〇）と群Bさん（●）で層別して色分け</strong>してみたところ、Aには「正の相関」、Bには「負の相関」がくっきりと隠れていることがわかりました。
</p>
  </div>
</div>

---

<div style="margin: 2em 0;">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-4841029986576213"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>

### 5. 【QC検定対策】よく問われる出題パターン

QC検定において、「層別」に関する問題は他の道具とセットで出題されます。以下のポイントは必ずおさえておきましょう。

**📝 頻出ポイント**
1.  **用語の定義**
    「たくさんのデータを、そのデータのもつ特徴から、いくつかのグループに分けること」という内容は「層別」のことを指しています。
2.  **「分類」との違いを見抜く**
    ライン別や時間帯別など「原因・要因の切り口」で分けているものは層別です。「1級品・2級品」のようにカテゴリーに当てはめるだけの「分類」は層別ではありません。
3.  **層別サンプリング**
    母集団の構成比率に合わせて、それぞれの層からサンプルを抜き取る「層別サンプリング」という用語もあわせて覚えておきましょう。

---

<div style="margin: 2em 0;">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-4841029986576213"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>

>### まとめ📌
>
>事実に基づく判断をスピーディかつ正確に行うためには、「全体を漫然と見る」のではなく、「意味のある切り口で分けて比べる」ことが不可欠です。
>
>*   **層別**は、データを履歴（5W1H）や特徴などの共通点によってグループ分けする「考え方」です。
>*   結果によって仕分ける「分類」とは異なります。
>*   パレート図、ヒストグラム、散布図などと組み合わせることで、隠れていた真の原因を突き止めることができます。

一通り学習したあとは、[試験対策問題](/questions/select?tab=custom&category=%E5%B1%A4%E5%88%A5)で力試ししてみましょう！