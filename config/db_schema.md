

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
question_id	varchar(50)	NO	MUL		
label	varchar(10)	NO			
text	text	NO			

quiz_large_category
large_category_id	varchar(50)	NO	PRI		
large_category_name	varchar(100)	NO			

quiz_questions
question_id	varchar(50)	NO	PRI		
title	varchar(255)	YES			
testlevel	int	YES			
image_data	tinyblob	YES			
body	text	YES			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
small_category_id	varchar(50)	NO	MUL		
explanation	text	YES			
explanation_data	blob	YES			

quiz_small_category
small_category_id	varchar(50)	NO	PRI		
small_category_name	varchar(100)	NO			
large_category_id	varchar(50)	NO	MUL		
scope_exam	int	YES			

sessions
session_id	varchar(128)	NO	PRI		
expires	int unsigned	NO			
data	mediumtext	YES			

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