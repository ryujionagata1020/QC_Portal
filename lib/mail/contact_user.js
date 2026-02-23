/**
 * 問い合わせ者への受付確認メール本文を生成する
 * @param {{ inquiryId: number, name: string, email: string, category: string, subject: string, message: string }} data
 * @returns {{ subject: string, text: string }}
 */
function buildUserMail(data) {
  const categoryLabels = {
    bug:     "バグ・不具合報告",
    feature: "機能・改善要望",
    usage:   "使い方の質問",
    other:   "その他",
  };
  const categoryLabel = categoryLabels[data.category] || data.category;

  const subject = `【QC-Portal】お問い合わせを受け付けました（受付番号：${data.inquiryId}）`;

  const text = `${data.name} 様

この度は QC-Portal へお問い合わせいただきありがとうございます。
以下の内容でお問い合わせを受け付けました。
内容を確認の上、順次ご返信いたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 受付番号：${data.inquiryId}
■ 種別　　：${categoryLabel}
■ 件名　　：${data.subject}
■ お問い合わせ内容：

${data.message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ このメールは自動送信です。このメールへの返信は受け付けておりません。

--
QC-Portal
https://qc-portal.com
`;

  return { subject, text };
}

module.exports = { buildUserMail };
