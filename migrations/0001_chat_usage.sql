CREATE TABLE "chat_usage" (
	"key" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chat_usage_key_day_pk" PRIMARY KEY("key","day")
);
