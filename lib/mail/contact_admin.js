/**
 * 管理者への新規問い合わせ通知メール本文を生成する
 * @param {{ inquiryId: number, name: string, email: string, category: string, subject: string, message: string, ip: string }} data
 * @returns {{ subject: string, text: string }}
 */
function buildAdminMail(data) {
  const categoryLabels = {
    bug:     "バグ・不具合報告",
    feature: "機能・改善要望",
    usage:   "使い方の質問",
    other:   "その他",
  };
  const categoryLabel = categoryLabels[data.category] || data.category;

  const subject = `【QC-Portal】新規お問い合わせ（受付番号：${data.inquiryId}）`;

  const text = `新しいお問い合わせが届きました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 受付番号：${data.inquiryId}
■ お名前　：${data.name}
■ メール　：${data.email}
■ 種別　　：${categoryLabel}
■ 件名　　：${data.subject}
■ 送信元IP：${data.ip}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 内容：

${data.message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return { subject, text };
}

module.exports = { buildAdminMail };
