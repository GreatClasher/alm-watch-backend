CREATE TABLE "speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"voice_embedding" vector(192),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'processing' NOT NULL,
	"full_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utterances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"speaker_id" uuid,
	"speaker_label" varchar(50),
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"text" text NOT NULL,
	"prosody" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utterances" ADD CONSTRAINT "utterances_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE set null ON UPDATE no action;