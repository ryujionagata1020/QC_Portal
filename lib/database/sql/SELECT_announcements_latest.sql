SELECT
  genre,
  published_at,
  title,
  content
FROM announcements
WHERE is_visible = 1
  AND published_at <= NOW()
ORDER BY published_at DESC
LIMIT 5
