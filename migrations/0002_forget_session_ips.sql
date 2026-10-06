-- Sessions no longer store the IP address or browser; forget the ones already kept
UPDATE "session" SET "ip_address" = NULL, "user_agent" = NULL;--> statement-breakpoint
DELETE FROM "session" WHERE "expires_at" < now();
