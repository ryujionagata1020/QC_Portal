// routes/question_select.js
const router = require("express").Router();
const { MySQLClient, sql } = require("../lib/database/client.js");

router.get("/", async (req, res, next) => {
  try {
    const query = await sql("SELECT_category_tree");
    const rows = await MySQLClient.executeQuery(query);

    // large_category_id ごとにグループ化
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.large_category_id]) {
        grouped[row.large_category_id] = {
          name: row.large_category_name,
          smalls: []
        };
      }
      grouped[row.large_category_id].smalls.push({
        id: row.small_category_id,
        name: row.small_category_name,
        scope_exam: row.scope_exam
      });
    });

    res.render("questions/select_question", { categories: grouped });
  } catch (err) {
    next(err);
  }
});

module.exports = router;