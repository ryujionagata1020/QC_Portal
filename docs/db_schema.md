

このプロジェクトのデータベース構造は下記のテーブルである。
それぞれのテーブルに対して
Field type Null Key Default Extra

quiz_answers
blank_id	varchar(50)	NO	PRI		
correct_choice_id	varchar(50)	NO	MUL		

quiz_blanks
blank_id	varchar(50)	NO	PRI		
question_id	varchar(50)	NO	MUL		
blank_number	int	NO			

quiz_choices
choice_id	varchar(50)	NO	PRI		
blank_id	varchar(50)	NO	MUL		
label	varchar(10)	NO			
choice_text	text	NO			

quiz_large_category
large_category_id	varchar(50)	NO	PRI		
large_category_name	varchar(100)	NO			
num	int	YES			
category_id	varchar(50)	YES			

quiz_questions
question_id	varchar(50)	NO	PRI		
title	varchar(255)	YES			
testlevel	int	YES			
image_data	longblob	YES			
body	text	YES			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
small_category_id	varchar(50)	NO	MUL		
explanation	text	YES			
explanation_data	longblob	YES					

quiz_small_category
small_category_id	varchar(50)	NO	PRI		
small_category_name	varchar(100)	NO			
large_category_id	varchar(50)	NO	MUL		
scope_exam	int	YES			
num	int	YES					

sessions
session_id	varchar(128)	NO	PRI
expires	int unsigned	NO
data	mediumtext	YES

quiz_sessions
id	int	NO	PRI		auto_increment
user_id	varchar(50)	NO	UNI
question_ids	json	NO
current_index	int	NO		0
session_started_at	datetime	NO
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
expires_at	datetime	NO

user_responses
response_id	bigint	NO	PRI		auto_increment
user_id	varchar(50)	NO	MUL		
blank_id	varchar(50)	NO	MUL		
selected_choice_id	varchar(50)	NO	MUL		
is_correct	tinyint(1)	NO			
answered_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

users
id	int	NO	PRI		auto_increment
user_id	varchar(50)	NO	UNI		
password_hash	varchar(255)	NO			
mail	varchar(255)	YES			
created_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
last_login_at	timestamp	YES			
update_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
reset_token	varchar(255)	YES	MUL		
reset_token_expire	timestamp	YES			
is_active	tinyint(1)	YES		1	
want_grade1	varchar(191)	YES			
want_grade2	varchar(191)	YES			
user_name	varchar(191)	YES			
scheduled_exam_date	date	YES			

theorypractice
category_id	varchar(50)	NO	PRI		
category_name	varchar(20)	NO		

announcement_id	int	NO	PRI		auto_increment
genre	enum('update','bugfix','news')	NO	MUL		
title	varchar(255)	NO			
content	text	NO			
published_at	datetime	NO	MUL	CURRENT_TIMESTAMP	DEFAULT_GENERATED
is_visible	tinyint(1)	NO		1	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP