CREATE TABLE "audio_packets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence_no" integer NOT NULL,
	"payload_type" varchar(20) DEFAULT 'AUDIO' NOT NULL,
	"payload" "bytea" NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"client_timestamp" bigint NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_audio_packets_session_seq" UNIQUE("session_id","sequence_no")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_serial" varchar(64) NOT NULL,
	"model" varchar(64),
	"firmware_version" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"battery_level" smallint,
	"ble_connected" boolean DEFAULT false NOT NULL,
	"flash_usage_percent" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_serial_unique" UNIQUE("device_serial")
);
--> statement-breakpoint
CREATE TABLE "heartbeat_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"battery_level" smallint,
	"ble_connected" boolean DEFAULT false NOT NULL,
	"flash_usage_percent" smallint DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firmware_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"target_model" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"binary_url" text NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"release_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"packet_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audio_packets" ADD CONSTRAINT "audio_packets_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_packets" ADD CONSTRAINT "audio_packets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;