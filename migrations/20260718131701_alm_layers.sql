CREATE TABLE "contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"confidence" real,
	"source" varchar(50),
	"payload" jsonb,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"context_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"participant_count" integer,
	"language" varchar(10),
	"confidence" real,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episode_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"importance" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"title" varchar(500),
	"summary" text,
	"category" varchar(100),
	"importance" real,
	"confidence" real,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relation" varchar(200) NOT NULL,
	"confidence" real,
	"source_episode_id" uuid,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"canonical_name" varchar(500) NOT NULL,
	"aliases" jsonb,
	"merged_into_id" uuid,
	"embedding" vector(384),
	"first_seen_at" timestamp with time zone,
	"source_episode_id" uuid,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"importance" real,
	"strength" real DEFAULT 1 NOT NULL,
	"embedding" vector(384),
	"source_episode_id" uuid,
	"last_recalled_at" timestamp with time zone,
	"last_updated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"conversation_id" uuid,
	"type" varchar(50) NOT NULL,
	"timestamp_start" timestamp with time zone NOT NULL,
	"timestamp_end" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"speaker_id" uuid,
	"confidence" real,
	"pipeline_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"target_layer" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"model_versions" jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recording_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recording_id" uuid NOT NULL,
	"sequence_no" integer NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"storage_uri" text NOT NULL,
	"checksum" varchar(64),
	"duration" real NOT NULL,
	"client_timestamp" bigint,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recording_segments_recording_id_sequence_no_unique" UNIQUE("recording_id","sequence_no")
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"codec" varchar(20) DEFAULT 'opus' NOT NULL,
	"sample_rate" integer DEFAULT 16000 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"recording_id" uuid,
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contexts" ADD CONSTRAINT "contexts_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contexts" ADD CONSTRAINT "contexts_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_context_id_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contexts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_artifacts" ADD CONSTRAINT "episode_artifacts_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_knowledge_entities_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_knowledge_entities_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_episode_id_episodes_id_fk" FOREIGN KEY ("source_episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entities" ADD CONSTRAINT "knowledge_entities_merged_into_id_knowledge_entities_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."knowledge_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entities" ADD CONSTRAINT "knowledge_entities_source_episode_id_episodes_id_fk" FOREIGN KEY ("source_episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entities" ADD CONSTRAINT "knowledge_entities_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_episode_id_episodes_id_fk" FOREIGN KEY ("source_episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_pipeline_run_id_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_segments" ADD CONSTRAINT "recording_segments_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_frames" ADD CONSTRAINT "sensor_frames_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_frames" ADD CONSTRAINT "sensor_frames_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_metrics_device_time_idx" ON "health_metrics" USING btree ("device_id","recorded_at");--> statement-breakpoint
CREATE INDEX "health_metrics_type_idx" ON "health_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "observations_recording_id_timestamp_start_idx" ON "observations" USING btree ("recording_id","timestamp_start");--> statement-breakpoint
CREATE INDEX "observations_type_idx" ON "observations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sensor_frames_device_recorded_at_idx" ON "sensor_frames" USING btree ("device_id","recorded_at");--> statement-breakpoint
CREATE INDEX "sensor_frames_type_idx" ON "sensor_frames" USING btree ("type");