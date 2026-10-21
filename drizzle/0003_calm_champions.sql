CREATE TABLE "awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" text NOT NULL,
	"title" text NOT NULL,
	"by" text DEFAULT '' NOT NULL,
	"project" text DEFAULT '' NOT NULL,
	"shown" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"name" text NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_documents_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nic" text DEFAULT '' NOT NULL,
	"mobile" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"lead_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"group" text NOT NULL,
	"q" text NOT NULL,
	"a" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"team" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'Full-time' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"duties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"closes" text DEFAULT '' NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"milestone" text NOT NULL,
	"condition" text DEFAULT '' NOT NULL,
	"pct" real DEFAULT 0 NOT NULL,
	"amount" integer NOT NULL,
	"due_date" text DEFAULT '' NOT NULL,
	"paid_at" text DEFAULT '' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"method" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"receipt_no" text,
	"recorded_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"dek" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Company' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"cover_media_id" integer,
	"author" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"unit_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"price_mn" numeric(10, 1) NOT NULL,
	"plan" text DEFAULT 'construction' NOT NULL,
	"agreement_step" integer DEFAULT 0 NOT NULL,
	"hold_until" timestamp with time zone,
	"agent" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sold_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"quote" text NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "hr_stage" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "payments_reservation" ON "payments" USING btree ("reservation_id","sort");--> statement-breakpoint
CREATE INDEX "reservations_unit" ON "reservations" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "reservations_customer" ON "reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservations_status" ON "reservations" USING btree ("status");