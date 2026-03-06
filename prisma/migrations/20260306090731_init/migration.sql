-- CreateEnum
CREATE TYPE "public"."OtpType" AS ENUM ('REGISTRATION_VERIFICATION', 'LOGIN_VERIFICATION', 'FORGOT_PASSWORD_VERIFICATION', 'PHONE_VERIFICATION');

-- CreateTable
CREATE TABLE "public"."scd_users" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "password" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notification" BOOLEAN NOT NULL DEFAULT false,
    "terms" BOOLEAN NOT NULL DEFAULT true,
    "googleId" TEXT,
    "linkedinId" TEXT,
    "provider" TEXT,
    "role" TEXT,
    "identity_verified_at" TIMESTAMP(3),
    "identity_verification_status" TEXT DEFAULT 'PENDING',
    "agency_verified_at" TIMESTAMP(3),
    "agency_verification_status" TEXT DEFAULT 'PENDING',
    "show_as_agency" BOOLEAN NOT NULL DEFAULT false,
    "currency_id" INTEGER,
    "profile_sections" JSONB,
    "profile_completion_percentage" INTEGER,
    "total_earning" DECIMAL(15,2),
    "total_withdrawal" DECIMAL(15,2),
    "wallet_amount" DECIMAL(15,2),
    "pending_amount" DECIMAL(15,2),

    CONSTRAINT "scd_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_personal_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "about" TEXT,
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "website" TEXT,
    "zipCode" TEXT,
    "hourly_rate" DOUBLE PRECISION,
    "available_hours_per_week" INTEGER,
    "links" JSONB,
    "languages" JSONB,
    "show_as_agency" BOOLEAN NOT NULL DEFAULT false,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_company_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "company_name" TEXT,
    "company_description" TEXT,
    "company_website" TEXT,
    "cin" TEXT,
    "company_size" TEXT,
    "founded_year" INTEGER,
    "company_stage" TEXT,
    "team_size" INTEGER,
    "revenue_model_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "revenue_description" TEXT,
    "target_market" TEXT,
    "problem_statement" TEXT,
    "solution_statement" TEXT,
    "traction_title" TEXT,
    "traction_document" TEXT,
    "funding_status" TEXT,
    "total_funding" DECIMAL(15,2),
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "links" JSONB,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "industry_id" INTEGER,
    "sub_industry_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_funding_rounds" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "investor_name" TEXT NOT NULL,
    "funding_stage" TEXT NOT NULL,
    "funding_amount" DECIMAL(15,2) NOT NULL,
    "funding_date" TIMESTAMP(3) NOT NULL,
    "funding_valuation" DECIMAL(15,2),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_funding_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_raising_funds" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "is_raising" BOOLEAN NOT NULL DEFAULT false,
    "round_type" TEXT,
    "target_amount" DECIMAL(15,2),
    "uses_of_fund" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_raising_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_education" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "area_of_study" TEXT NOT NULL,
    "start_month" TEXT NOT NULL,
    "start_year" TEXT NOT NULL,
    "end_month" TEXT,
    "end_year" TEXT,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_licenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "institute" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "completed_month" TEXT NOT NULL,
    "completed_year" TEXT NOT NULL,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_expertise_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_expertise_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_specialties" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expertise_category_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expertise_category_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_industries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_sub_industries" (
    "id" SERIAL NOT NULL,
    "industry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_sub_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_business_models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_business_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_revenue_models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_revenue_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_team_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_team_members" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role_id" INTEGER NOT NULL,
    "bio" TEXT,
    "profile_image" TEXT,
    "linkedin_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_user_expertises" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expertise_category_id" INTEGER NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_expertises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_otps" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "otp_code" TEXT NOT NULL,
    "otp_type" "public"."OtpType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone_code" TEXT,
    "flag" TEXT,
    "currency_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_currencies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_rate" DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_languages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT,
    "code" TEXT NOT NULL,
    "country_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_work_experiences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_website" TEXT,
    "description" TEXT,
    "start_month" TEXT NOT NULL,
    "start_year" TEXT NOT NULL,
    "end_month" TEXT,
    "end_year" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "company" TEXT NOT NULL,
    "completed_month" TEXT NOT NULL,
    "completed_year" TEXT NOT NULL,
    "achievement_link" TEXT,
    "media_files" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_identity_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT,
    "id_type" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "id_expiry_date" TIMESTAMP(3),
    "issuing_country" TEXT NOT NULL,
    "id_document_urls" JSONB NOT NULL,
    "selfie_urls" JSONB NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "address_country" TEXT NOT NULL,
    "proof_of_address_consent" TEXT,
    "address_proof_urls" JSONB,
    "document_type" TEXT,
    "institution_name" TEXT,
    "document_date_issued" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_agency_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agency_name" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "document_urls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_agency_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_portfolios" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "company_name" TEXT,
    "hide_company_name" BOOLEAN NOT NULL DEFAULT false,
    "industry_id" INTEGER,
    "role" TEXT,
    "project_skills" JSONB,
    "thumbnail_url" TEXT,
    "media_urls" JSONB,
    "project_link" TEXT,
    "completion_month" TEXT,
    "completion_year" TEXT,
    "references" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investor_portfolios" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo" TEXT,
    "description" TEXT,
    "company_website" TEXT,
    "industry_id" INTEGER,
    "sub_industry_id" INTEGER,
    "investment_size" DECIMAL(15,2),
    "investment_size_currency" TEXT,
    "investment_date" TIMESTAMP(3),
    "round_participated_in" TEXT,
    "current_status" TEXT DEFAULT 'Active',
    "board_advisory_role" TEXT,
    "impact_in_company_growth" TEXT,
    "exit_information" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investor_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investment_profiles" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "investor_types" JSONB,
    "thesis_summary" TEXT,
    "diligence_process" TEXT,
    "diligence_document" TEXT,
    "investment_size_min" DECIMAL(15,2),
    "investment_size_max" DECIMAL(15,2),
    "investment_size_currency" TEXT,
    "equity_range_min" INTEGER,
    "equity_range_max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investment_profile_preferred_industries" (
    "id" SERIAL NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "industry_id" INTEGER NOT NULL,
    "sub_industry_id" INTEGER,
    "specialisation" VARCHAR(500),
    "investment_stage" VARCHAR(255),
    "investment_criteria" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_preferred_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investment_profile_committee_members" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255),
    "role_description" TEXT,
    "photo" TEXT,
    "email" VARCHAR(255),
    "hide_email" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investment_profile_geo_preferences" (
    "id" SERIAL NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "state_id" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_geo_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_founder_projects" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_title" VARCHAR(50) NOT NULL,
    "project_description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "project_files" JSONB NOT NULL DEFAULT '[]',
    "scope_of_work" TEXT NOT NULL,
    "skills_required" JSONB NOT NULL,
    "experience_needed" VARCHAR(50) NOT NULL,
    "budget_currency" VARCHAR(10) NOT NULL,
    "budget_amount" VARCHAR(20) NOT NULL,
    "is_nda_required" BOOLEAN NOT NULL DEFAULT false,
    "screening_questions" JSONB NOT NULL DEFAULT '[]',
    "advanced_preferences" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invited_count" INTEGER NOT NULL DEFAULT 0,
    "proposals_count" INTEGER NOT NULL DEFAULT 0,
    "hired_count" INTEGER NOT NULL DEFAULT 0,
    "saved_providers" JSONB NOT NULL DEFAULT '[]',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_founder_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_project_invites" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_project_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_saved_projects" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_saved_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_proposals" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "cover_letter" TEXT NOT NULL,
    "proposed_amount" DECIMAL(15,2) NOT NULL,
    "payment_schedule" VARCHAR(20) NOT NULL,
    "hours_required" INTEGER,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "screening_answers" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "nda" JSONB,
    "milestones_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminate_at" TIMESTAMP(3),
    "terminate_by" INTEGER,

    CONSTRAINT "scd_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_reviews" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "review_from_id" INTEGER NOT NULL,
    "review_to_id" INTEGER NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "action_id" VARCHAR(100) NOT NULL,
    "review_type" VARCHAR(20) NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "feedback" TEXT,
    "end_reason" VARCHAR(255),
    "ratings_extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_milestones" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "due_date" DATE,
    "hours_required" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_deliverables" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ,
    "submitted_remark" TEXT,
    "submitted_file" JSONB NOT NULL DEFAULT '[]',
    "approved_at" TIMESTAMPTZ,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_conversations" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user1_id" INTEGER NOT NULL,
    "user2_id" INTEGER NOT NULL,
    "status" VARCHAR(20),
    "blocked_by_user_id" INTEGER,
    "user1_has_new_message" BOOLEAN NOT NULL DEFAULT false,
    "user2_has_new_message" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_messages" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER,
    "type" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_sub_categories" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_keywords" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_packages" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "package_description" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "industries" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "scope" JSONB NOT NULL DEFAULT '{}',
    "extra_add_ons" JSONB NOT NULL DEFAULT '[]',
    "deliverables" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "links" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "thumbnail" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "video" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "has_basic" BOOLEAN NOT NULL DEFAULT false,
    "has_standard" BOOLEAN NOT NULL DEFAULT false,
    "has_premium" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_upload_files" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'UNATTACH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_payment_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "payment_type" VARCHAR(20) NOT NULL,
    "razorpay_customer_id" VARCHAR(255),
    "razorpay_payment_id" VARCHAR(255),
    "card_token" VARCHAR(255),
    "card_brand" VARCHAR(50),
    "last_four_digits" VARCHAR(4),
    "card_holder_name" VARCHAR(100),
    "expiry_month" VARCHAR(2),
    "expiry_year" VARCHAR(4),
    "paypal_email" VARCHAR(255),
    "paypal_payer_id" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_amount" DECIMAL(10,2),
    "verified_at" TIMESTAMP(3),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_withdrawal_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "display_label" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(100),
    "account_number" VARCHAR(34),
    "account_number_last4" VARCHAR(4),
    "ifsc" VARCHAR(11),
    "upi_id" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_withdrawal_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_tax_information" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tax_residence" JSONB NOT NULL,
    "has_gstin" BOOLEAN NOT NULL DEFAULT false,
    "gstin" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_tax_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_billing_transactions" (
    "id" SERIAL NOT NULL,
    "unique_id" VARCHAR(26) NOT NULL,
    "actor_type" VARCHAR(50) NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "from_type" VARCHAR(50) NOT NULL,
    "from_id" INTEGER NOT NULL,
    "to_type" VARCHAR(50) NOT NULL,
    "to_id" INTEGER NOT NULL,
    "subject_type" VARCHAR(50) NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency_id" INTEGER NOT NULL DEFAULT 1,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "invoice_url" VARCHAR(500),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_unique_id_key" ON "public"."scd_users"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_email_key" ON "public"."scd_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_phone_key" ON "public"."scd_users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_googleId_key" ON "public"."scd_users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_linkedinId_key" ON "public"."scd_users"("linkedinId");

-- CreateIndex
CREATE INDEX "scd_users_email_phone_idx" ON "public"."scd_users"("email", "phone");

-- CreateIndex
CREATE INDEX "scd_users_last_name_first_name_email_idx" ON "public"."scd_users"("last_name", "first_name", "email");

-- CreateIndex
CREATE INDEX "scd_users_googleId_idx" ON "public"."scd_users"("googleId");

-- CreateIndex
CREATE INDEX "scd_users_linkedinId_idx" ON "public"."scd_users"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_user_id_key" ON "public"."scd_personal_info"("user_id");

-- CreateIndex
CREATE INDEX "scd_personal_info_user_id_idx" ON "public"."scd_personal_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_user_id_key" ON "public"."scd_company_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_unique_id_key" ON "public"."scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_unique_id_idx" ON "public"."scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_user_id_idx" ON "public"."scd_company_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_funding_rounds_company_profile_id_idx" ON "public"."scd_funding_rounds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_raising_funds_company_profile_id_key" ON "public"."scd_raising_funds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_expertise_categories_name_key" ON "public"."scd_expertise_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_specialties_name_expertise_category_id_key" ON "public"."scd_specialties"("name", "expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_skills_name_expertise_category_id_key" ON "public"."scd_skills"("name", "expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_industries_name_key" ON "public"."scd_industries"("name");

-- CreateIndex
CREATE INDEX "scd_sub_industries_industry_id_idx" ON "public"."scd_sub_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_sub_industries_industry_id_name_key" ON "public"."scd_sub_industries"("industry_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_name_key" ON "public"."scd_business_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_code_key" ON "public"."scd_business_models"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_revenue_models_name_key" ON "public"."scd_revenue_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_revenue_models_code_key" ON "public"."scd_revenue_models"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_roles_name_key" ON "public"."scd_team_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_roles_code_key" ON "public"."scd_team_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_members_unique_id_key" ON "public"."scd_team_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_team_members_company_profile_id_idx" ON "public"."scd_team_members"("company_profile_id");

-- CreateIndex
CREATE INDEX "scd_team_members_unique_id_idx" ON "public"."scd_team_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_otps_email_otp_type_verified_idx" ON "public"."scd_otps"("email", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_phone_otp_type_verified_idx" ON "public"."scd_otps"("phone", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_expires_at_idx" ON "public"."scd_otps"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_name_key" ON "public"."scd_countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_code_key" ON "public"."scd_countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_states_name_country_id_key" ON "public"."scd_states"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_name_key" ON "public"."scd_currencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_code_key" ON "public"."scd_currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_name_key" ON "public"."scd_languages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_code_key" ON "public"."scd_languages"("code");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_user_id_status_idx" ON "public"."scd_identity_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_status_idx" ON "public"."scd_identity_verifications"("status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_user_id_status_idx" ON "public"."scd_agency_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_status_idx" ON "public"."scd_agency_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_portfolios_unique_id_key" ON "public"."scd_portfolios"("unique_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_user_id_status_idx" ON "public"."scd_portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_portfolios_status_idx" ON "public"."scd_portfolios"("status");

-- CreateIndex
CREATE INDEX "scd_portfolios_industry_id_idx" ON "public"."scd_portfolios"("industry_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_deleted_at_idx" ON "public"."scd_portfolios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investor_portfolios_unique_id_key" ON "public"."scd_investor_portfolios"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_user_id_status_idx" ON "public"."scd_investor_portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_status_idx" ON "public"."scd_investor_portfolios"("status");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_industry_id_idx" ON "public"."scd_investor_portfolios"("industry_id");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_deleted_at_idx" ON "public"."scd_investor_portfolios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_unique_id_key" ON "public"."scd_investment_profiles"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_user_id_key" ON "public"."scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profiles_user_id_idx" ON "public"."scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_investment_prof_idx" ON "public"."scd_investment_profile_preferred_industries"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_industry_id_idx" ON "public"."scd_investment_profile_preferred_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profile_committee_members_unique_id_key" ON "public"."scd_investment_profile_committee_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_committee_members_investment_profile_idx" ON "public"."scd_investment_profile_committee_members"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_investment_profile_i_idx" ON "public"."scd_investment_profile_geo_preferences"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_country_id_idx" ON "public"."scd_investment_profile_geo_preferences"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_founder_projects_unique_id_key" ON "public"."scd_founder_projects"("unique_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_user_id_status_idx" ON "public"."scd_founder_projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_status_idx" ON "public"."scd_founder_projects"("status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_category_id_idx" ON "public"."scd_founder_projects"("category_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_sub_category_id_idx" ON "public"."scd_founder_projects"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_deleted_at_idx" ON "public"."scd_founder_projects"("deleted_at");

-- CreateIndex
CREATE INDEX "scd_founder_projects_created_at_idx" ON "public"."scd_founder_projects"("created_at");

-- CreateIndex
CREATE INDEX "scd_project_invites_project_id_idx" ON "public"."scd_project_invites"("project_id");

-- CreateIndex
CREATE INDEX "scd_project_invites_provider_id_idx" ON "public"."scd_project_invites"("provider_id");

-- CreateIndex
CREATE INDEX "scd_project_invites_status_idx" ON "public"."scd_project_invites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_project_invites_project_id_provider_id_key" ON "public"."scd_project_invites"("project_id", "provider_id");

-- CreateIndex
CREATE INDEX "scd_saved_projects_project_id_idx" ON "public"."scd_saved_projects"("project_id");

-- CreateIndex
CREATE INDEX "scd_saved_projects_user_id_idx" ON "public"."scd_saved_projects"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_saved_projects_project_id_user_id_key" ON "public"."scd_saved_projects"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposals_unique_id_key" ON "public"."scd_proposals"("unique_id");

-- CreateIndex
CREATE INDEX "scd_proposals_project_id_idx" ON "public"."scd_proposals"("project_id");

-- CreateIndex
CREATE INDEX "scd_proposals_provider_id_idx" ON "public"."scd_proposals"("provider_id");

-- CreateIndex
CREATE INDEX "scd_proposals_status_idx" ON "public"."scd_proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposals_project_id_provider_id_key" ON "public"."scd_proposals"("project_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_unique_id_key" ON "public"."scd_reviews"("unique_id");

-- CreateIndex
CREATE INDEX "scd_reviews_review_to_id_action_type_idx" ON "public"."scd_reviews"("review_to_id", "action_type");

-- CreateIndex
CREATE INDEX "scd_reviews_action_type_action_id_idx" ON "public"."scd_reviews"("action_type", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_review_from_id_review_to_id_action_type_action__key" ON "public"."scd_reviews"("review_from_id", "review_to_id", "action_type", "action_id", "review_type");

-- CreateIndex
CREATE UNIQUE INDEX "scd_milestones_unique_id_key" ON "public"."scd_milestones"("unique_id");

-- CreateIndex
CREATE INDEX "scd_milestones_project_id_idx" ON "public"."scd_milestones"("project_id");

-- CreateIndex
CREATE INDEX "scd_milestones_proposal_id_idx" ON "public"."scd_milestones"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_milestones_proposal_id_order_index_key" ON "public"."scd_milestones"("proposal_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "scd_deliverables_unique_id_key" ON "public"."scd_deliverables"("unique_id");

-- CreateIndex
CREATE INDEX "scd_deliverables_milestone_id_idx" ON "public"."scd_deliverables"("milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_deliverables_milestone_id_order_index_key" ON "public"."scd_deliverables"("milestone_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "scd_conversations_unique_id_key" ON "public"."scd_conversations"("unique_id");

-- CreateIndex
CREATE INDEX "scd_conversations_user1_id_user2_id_idx" ON "public"."scd_conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_conversations_user1_id_user2_id_key" ON "public"."scd_conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_messages_unique_id_key" ON "public"."scd_messages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_messages_conversation_id_created_at_idx" ON "public"."scd_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_categories_name_key" ON "public"."scd_service_categories"("name");

-- CreateIndex
CREATE INDEX "scd_service_categories_is_active_idx" ON "public"."scd_service_categories"("is_active");

-- CreateIndex
CREATE INDEX "scd_service_sub_categories_category_id_idx" ON "public"."scd_service_sub_categories"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_sub_categories_is_active_idx" ON "public"."scd_service_sub_categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_sub_categories_category_id_name_key" ON "public"."scd_service_sub_categories"("category_id", "name");

-- CreateIndex
CREATE INDEX "scd_service_keywords_category_id_idx" ON "public"."scd_service_keywords"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_keywords_sub_category_id_idx" ON "public"."scd_service_keywords"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_service_keywords_is_active_idx" ON "public"."scd_service_keywords"("is_active");

-- CreateIndex
CREATE INDEX "scd_service_keywords_popularity_score_idx" ON "public"."scd_service_keywords"("popularity_score");

-- CreateIndex
CREATE INDEX "scd_service_keywords_name_idx" ON "public"."scd_service_keywords"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_keywords_category_id_name_key" ON "public"."scd_service_keywords"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_packages_unique_id_key" ON "public"."scd_service_packages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_user_id_idx" ON "public"."scd_service_packages"("user_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_category_id_idx" ON "public"."scd_service_packages"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_sub_category_id_idx" ON "public"."scd_service_packages"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_status_idx" ON "public"."scd_service_packages"("status");

-- CreateIndex
CREATE INDEX "scd_upload_files_created_at_idx" ON "public"."scd_upload_files"("created_at");

-- CreateIndex
CREATE INDEX "scd_upload_files_mime_type_idx" ON "public"."scd_upload_files"("mime_type");

-- CreateIndex
CREATE INDEX "scd_upload_files_mime_type_path_idx" ON "public"."scd_upload_files"("mime_type", "path");

-- CreateIndex
CREATE INDEX "scd_payment_methods_user_id_idx" ON "public"."scd_payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "scd_payment_methods_payment_type_idx" ON "public"."scd_payment_methods"("payment_type");

-- CreateIndex
CREATE INDEX "scd_payment_methods_is_default_idx" ON "public"."scd_payment_methods"("is_default");

-- CreateIndex
CREATE INDEX "scd_payment_methods_razorpay_customer_id_idx" ON "public"."scd_payment_methods"("razorpay_customer_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_methods_user_id_idx" ON "public"."scd_withdrawal_methods"("user_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_methods_is_default_idx" ON "public"."scd_withdrawal_methods"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "scd_tax_information_user_id_key" ON "public"."scd_tax_information"("user_id");

-- CreateIndex
CREATE INDEX "scd_tax_information_user_id_idx" ON "public"."scd_tax_information"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_unique_id_key" ON "public"."scd_billing_transactions"("unique_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_actor_type_actor_id_idx" ON "public"."scd_billing_transactions"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_from_type_from_id_idx" ON "public"."scd_billing_transactions"("from_type", "from_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_to_type_to_id_idx" ON "public"."scd_billing_transactions"("to_type", "to_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_subject_type_subject_id_idx" ON "public"."scd_billing_transactions"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_status_idx" ON "public"."scd_billing_transactions"("status");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_created_at_idx" ON "public"."scd_billing_transactions"("created_at");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_unique_id_idx" ON "public"."scd_billing_transactions"("unique_id");

-- AddForeignKey
ALTER TABLE "public"."scd_users" ADD CONSTRAINT "scd_users_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "public"."scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_funding_rounds" ADD CONSTRAINT "scd_funding_rounds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_raising_funds" ADD CONSTRAINT "scd_raising_funds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_education" ADD CONSTRAINT "scd_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_licenses" ADD CONSTRAINT "scd_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_specialties" ADD CONSTRAINT "scd_specialties_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_skills" ADD CONSTRAINT "scd_skills_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_sub_industries" ADD CONSTRAINT "scd_sub_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_team_members" ADD CONSTRAINT "scd_team_members_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_team_members" ADD CONSTRAINT "scd_team_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."scd_team_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."scd_specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_otps" ADD CONSTRAINT "scd_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_countries" ADD CONSTRAINT "scd_countries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_states" ADD CONSTRAINT "scd_states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_work_experiences" ADD CONSTRAINT "scd_work_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_achievements" ADD CONSTRAINT "scd_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_identity_verifications" ADD CONSTRAINT "scd_identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_agency_verifications" ADD CONSTRAINT "scd_agency_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_portfolios" ADD CONSTRAINT "scd_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_portfolios" ADD CONSTRAINT "scd_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "public"."scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profiles" ADD CONSTRAINT "scd_investment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_investment_pro_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "public"."scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_sub_industry_i_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "public"."scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_committee_members" ADD CONSTRAINT "scd_investment_profile_committee_members_investment_profil_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "public"."scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_investment_profile__fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "public"."scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_project_invites" ADD CONSTRAINT "scd_project_invites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_project_invites" ADD CONSTRAINT "scd_project_invites_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_saved_projects" ADD CONSTRAINT "scd_saved_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_saved_projects" ADD CONSTRAINT "scd_saved_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_proposals" ADD CONSTRAINT "scd_proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_proposals" ADD CONSTRAINT "scd_proposals_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_reviews" ADD CONSTRAINT "scd_reviews_review_from_id_fkey" FOREIGN KEY ("review_from_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_reviews" ADD CONSTRAINT "scd_reviews_review_to_id_fkey" FOREIGN KEY ("review_to_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_milestones" ADD CONSTRAINT "scd_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_milestones" ADD CONSTRAINT "scd_milestones_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."scd_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_deliverables" ADD CONSTRAINT "scd_deliverables_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."scd_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_conversations" ADD CONSTRAINT "scd_conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_messages" ADD CONSTRAINT "scd_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."scd_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_messages" ADD CONSTRAINT "scd_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."scd_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_sub_categories" ADD CONSTRAINT "scd_service_sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_keywords" ADD CONSTRAINT "scd_service_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_keywords" ADD CONSTRAINT "scd_service_keywords_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_payment_methods" ADD CONSTRAINT "scd_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_withdrawal_methods" ADD CONSTRAINT "scd_withdrawal_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_tax_information" ADD CONSTRAINT "scd_tax_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
