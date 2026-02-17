DELETE FROM quiz_sessions WHERE expires_at <= NOW();
