-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('REGISTRATION_VERIFICATION', 'LOGIN_VERIFICATION', 'FORGOT_PASSWORD_VERIFICATION', 'PHONE_VERIFICATION', 'EMAIL_VERIFICATION', 'DEACTIVATE_ACCOUNT', 'TWO_FA_VERIFICATION');

-- CreateEnum
CREATE TYPE "BillingTransactionType" AS ENUM ('payment', 'refund', 'withdrawal');

-- CreateEnum
CREATE TYPE "BillingTransactionStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "BillingTransactionSenderStatus" AS ENUM ('funded', 'completed', 'released');

-- CreateEnum
CREATE TYPE "BillingTransactionReceiverStatus" AS ENUM ('pending', 'completed', 'released', 'withdraw_in_process', 'paid_out');

-- CreateEnum
CREATE TYPE "BillingTransactionAdminStatus" AS ENUM ('loaded', 'sent_to_freelancer', 'success');

-- CreateEnum
CREATE TYPE "WithdrawalRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "scd_users" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
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
    "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_fa_method" TEXT,
    "backup_codes" JSONB,
    "role" TEXT,
    "identity_verified_at" TIMESTAMP(3),
    "identity_verification_status" TEXT DEFAULT 'PENDING',
    "agency_verified_at" TIMESTAMP(3),
    "agency_verification_status" TEXT DEFAULT 'PENDING',
    "show_as_agency" BOOLEAN NOT NULL DEFAULT false,
    "currency_id" INTEGER,
    "profile_completion_percentage" INTEGER,
    "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
    "razorpay_contact_id" VARCHAR(64),
    "razorpay_account_id" VARCHAR(64),
    "digilocker_state" VARCHAR(64),

    CONSTRAINT "scd_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profile_sections" JSONB,
    "email_notification_preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_user_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "wallet_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_earning" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_withdrawal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_personal_info" (
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
    "keycode" TEXT,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_company_profiles" (
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
    "revenue_models" JSONB,
    "revenue_description" TEXT,
    "target_market" TEXT,
    "problem_statement" TEXT,
    "solution_statement" TEXT,
    "traction_title" TEXT,
    "traction_document" TEXT,
    "funding_status" TEXT,
    "total_funding" DECIMAL(15,2),
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "is_branch_same_as_hq" BOOLEAN NOT NULL DEFAULT false,
    "branch_address" TEXT,
    "branch_address_line_2" TEXT,
    "branch_city" TEXT,
    "branch_zipCode" TEXT,
    "founders_video_url" TEXT,
    "cap_table_url" TEXT,
    "cap_table_file" TEXT,
    "product_demo_url" TEXT,
    "links" JSONB,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "branch_country_id" INTEGER,
    "branch_state_id" INTEGER,
    "industry_id" INTEGER,
    "sub_industry_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_funding_rounds" (
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
CREATE TABLE "scd_raising_funds" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "is_raising" BOOLEAN NOT NULL DEFAULT false,
    "funding_stage" TEXT,
    "round_type" TEXT,
    "target_amount" DECIMAL(15,2),
    "expected_close_date" TEXT,
    "valuation_min" DECIMAL(15,2),
    "valuation_max" DECIMAL(15,2),
    "has_committed" BOOLEAN DEFAULT false,
    "committed_amount" DECIMAL(15,2),
    "committed_investor" TEXT,
    "uses_of_fund" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_raising_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_education" (
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
CREATE TABLE "scd_licenses" (
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
CREATE TABLE "scd_expertise_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_expertise_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_specialties" (
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
CREATE TABLE "scd_skills" (
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
CREATE TABLE "scd_industries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_sub_industries" (
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
CREATE TABLE "scd_business_models" (
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
CREATE TABLE "scd_team_members" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "is_cofounder" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "profile_image" TEXT,
    "linkedin_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_user_expertises" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expertise_category_id" INTEGER NOT NULL,
    "specialty_ids" JSONB,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_expertises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_otps" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "otp_code" TEXT NOT NULL,
    "otp_type" "OtpType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_countries" (
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
CREATE TABLE "scd_states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_currencies" (
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
CREATE TABLE "scd_languages" (
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
CREATE TABLE "scd_work_experiences" (
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
CREATE TABLE "scd_achievements" (
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
CREATE TABLE "scd_identity_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "verification_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "meta_data" JSONB,
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_agency_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agency_name" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "document_urls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_agency_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_portfolios" (
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
CREATE TABLE "scd_investor_portfolios" (
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
CREATE TABLE "scd_investment_profiles" (
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
CREATE TABLE "scd_investment_profile_preferred_industries" (
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
CREATE TABLE "scd_investment_profile_committee_members" (
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
CREATE TABLE "scd_investment_profile_geo_preferences" (
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
CREATE TABLE "scd_founder_projects" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_title" VARCHAR(100) NOT NULL,
    "project_description" TEXT,
    "expertise_category_id" INTEGER,
    "specialty_id" INTEGER,
    "project_files" JSONB NOT NULL DEFAULT '[]',
    "scope_of_work" TEXT,
    "skills_required" JSONB NOT NULL DEFAULT '[]',
    "experience_needed" VARCHAR(50),
    "budget_currency" VARCHAR(10),
    "budget_amount" VARCHAR(20),
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
CREATE TABLE "scd_project_invites" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "message" TEXT,
    "main_reason" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_project_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_saved_projects" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_saved_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_proposals" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "cover_letter" TEXT NOT NULL,
    "proposed_amount" DECIMAL(15,2) NOT NULL,
    "payment_schedule" VARCHAR(20) NOT NULL,
    "hours_required" INTEGER,
    "screening_answers" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "founder_remark" TEXT,
    "founder_reason" VARCHAR(50),
    "freelancer_remark" TEXT,
    "freelancer_reason" VARCHAR(50),
    "milestones_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminate_at" TIMESTAMP(3),
    "terminate_by" INTEGER,

    CONSTRAINT "scd_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_proposal_ndas" (
    "id" SERIAL NOT NULL,
    "proposal_id" INTEGER NOT NULL,
    "offer_expires_at" TIMESTAMP(3),
    "is_nda_signed" BOOLEAN NOT NULL DEFAULT false,
    "nda_file_link" VARCHAR(512),
    "nda_sent_at" TIMESTAMP(3),
    "nda_signed_at" TIMESTAMP(3),
    "nda_signed_file_link" VARCHAR(512),
    "nda_downloaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_proposal_ndas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_reviews" (
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
CREATE TABLE "scd_milestones" (
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
    "service_fee_amount" DECIMAL(10,2),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_deliverables" (
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
CREATE TABLE "scd_conversations" (
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
CREATE TABLE "scd_messages" (
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
CREATE TABLE "scd_schedule_termination" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "action" VARCHAR(20),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "scd_schedule_termination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_service_packages" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "package_description" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "industries" JSONB NOT NULL DEFAULT '[]',
    "skill_ids" JSONB NOT NULL DEFAULT '[]',
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
    "basic_label" VARCHAR(50) DEFAULT 'Basic',
    "standard_label" VARCHAR(50) DEFAULT 'Standard',
    "premium_label" VARCHAR(50) DEFAULT 'Premium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_payment_methods" (
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
CREATE TABLE "scd_bank_information" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'bank_account',
    "entity_type" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    "display_label" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(100),
    "account_holder_name" VARCHAR(200),
    "account_number" VARCHAR(34),
    "account_number_last4" VARCHAR(4),
    "ifsc" VARCHAR(11),
    "razorpay_fund_account_id" VARCHAR(64),
    "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "verification_failure_reason" VARCHAR(500),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_bank_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_withdrawal_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "withdrawal_method_id" INTEGER NOT NULL,
    "billing_transaction_id" INTEGER NOT NULL,
    "status" "WithdrawalRequestStatus" NOT NULL,
    "withdrawal_trigger_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_tax_information" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tax_residence" JSONB NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "pan_number" VARCHAR(10),
    "individual_name" VARCHAR(200),
    "individual_pan" VARCHAR(10),
    "individual_gstin" VARCHAR(15),
    "agency_name" VARCHAR(200),
    "agency_pan" VARCHAR(10),
    "agency_gstin" VARCHAR(15),
    "has_gstin" BOOLEAN NOT NULL DEFAULT false,
    "gstin" VARCHAR(15),
    "individual_gstin_status" VARCHAR(20) DEFAULT 'PENDING',
    "individual_gstin_verified_at" TIMESTAMP(3),
    "individual_gstin_failure_reason" VARCHAR(500),
    "individual_gstin_api_response" JSONB,
    "agency_gstin_status" VARCHAR(20) DEFAULT 'PENDING',
    "agency_gstin_verified_at" TIMESTAMP(3),
    "agency_gstin_failure_reason" VARCHAR(500),
    "agency_gstin_api_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_tax_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_billing_transactions" (
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
    "milestone_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "payer_amount" DECIMAL(10,2),
    "receiver_amount" DECIMAL(10,2),
    "currency_id" INTEGER NOT NULL DEFAULT 1,
    "type" "BillingTransactionType" NOT NULL,
    "status" "BillingTransactionStatus" NOT NULL,
    "sender_status" "BillingTransactionSenderStatus",
    "receiver_status" "BillingTransactionReceiverStatus",
    "admin_status" "BillingTransactionAdminStatus",
    "description" TEXT NOT NULL,
    "invoice_url" VARCHAR(500),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "payer_invoice_id" INTEGER,
    "receiver_invoice_id" INTEGER,

    CONSTRAINT "scd_billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_invoices" (
    "id" SERIAL NOT NULL,
    "billing_transaction_id" INTEGER NOT NULL,
    "party" VARCHAR(20) NOT NULL,
    "sender_name" VARCHAR(255) NOT NULL,
    "receiver_name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency_code" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "gst_number" VARCHAR(50),
    "platform_gst" VARCHAR(50),
    "sender_gst" VARCHAR(50),
    "receiver_gst" VARCHAR(50),
    "fee" DECIMAL(10,2),
    "gst_amount" DECIMAL(10,2),
    "file_url" VARCHAR(500),
    "meta" JSONB,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_login_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" VARCHAR(512) NOT NULL,
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50),
    "browser" VARCHAR(100),
    "os" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scd_login_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(1024),
    "read_at" TIMESTAMP(3),
    "actor_id" INTEGER,
    "subject_type" VARCHAR(80),
    "subject_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_activities" (
    "id" SERIAL NOT NULL,
    "subject_type" VARCHAR(80) NOT NULL,
    "subject_unique_id" VARCHAR(64) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_attachments" (
    "id" SERIAL NOT NULL,
    "unique_id" VARCHAR(36) NOT NULL,
    "owner_user_id" INTEGER NOT NULL,
    "uploaded_by_user_id" INTEGER NOT NULL,
    "disk" VARCHAR(20) NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "visibility" VARCHAR(20) NOT NULL,
    "mime_type" VARCHAR(128),
    "size_bytes" INTEGER,
    "original_name" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'attached',
    "accessible_user_ids" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scd_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_redirect_links" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "created_by" INTEGER,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_redirect_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_unique_id_key" ON "scd_users"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_email_key" ON "scd_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_phone_key" ON "scd_users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_googleId_key" ON "scd_users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_linkedinId_key" ON "scd_users"("linkedinId");

-- CreateIndex
CREATE INDEX "scd_users_email_phone_idx" ON "scd_users"("email", "phone");

-- CreateIndex
CREATE INDEX "scd_users_last_name_first_name_email_idx" ON "scd_users"("last_name", "first_name", "email");

-- CreateIndex
CREATE INDEX "scd_users_googleId_idx" ON "scd_users"("googleId");

-- CreateIndex
CREATE INDEX "scd_users_linkedinId_idx" ON "scd_users"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_preferences_user_id_key" ON "scd_user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_wallets_user_id_key" ON "scd_user_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_user_id_key" ON "scd_personal_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_keycode_key" ON "scd_personal_info"("keycode");

-- CreateIndex
CREATE INDEX "scd_personal_info_user_id_idx" ON "scd_personal_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_user_id_key" ON "scd_company_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_unique_id_key" ON "scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_unique_id_idx" ON "scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_user_id_idx" ON "scd_company_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_funding_rounds_company_profile_id_idx" ON "scd_funding_rounds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_raising_funds_company_profile_id_key" ON "scd_raising_funds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_expertise_categories_name_key" ON "scd_expertise_categories"("name");

-- CreateIndex
CREATE INDEX "scd_specialties_expertise_category_id_idx" ON "scd_specialties"("expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_specialties_name_expertise_category_id_key" ON "scd_specialties"("name", "expertise_category_id");

-- CreateIndex
CREATE INDEX "scd_skills_expertise_category_id_idx" ON "scd_skills"("expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_skills_name_expertise_category_id_key" ON "scd_skills"("name", "expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_industries_name_key" ON "scd_industries"("name");

-- CreateIndex
CREATE INDEX "scd_sub_industries_industry_id_idx" ON "scd_sub_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_sub_industries_industry_id_name_key" ON "scd_sub_industries"("industry_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_name_key" ON "scd_business_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_code_key" ON "scd_business_models"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_members_unique_id_key" ON "scd_team_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_team_members_company_profile_id_idx" ON "scd_team_members"("company_profile_id");

-- CreateIndex
CREATE INDEX "scd_team_members_unique_id_idx" ON "scd_team_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_otps_email_otp_type_verified_idx" ON "scd_otps"("email", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_phone_otp_type_verified_idx" ON "scd_otps"("phone", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_expires_at_idx" ON "scd_otps"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_name_key" ON "scd_countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_code_key" ON "scd_countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_states_name_country_id_key" ON "scd_states"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_name_key" ON "scd_currencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_code_key" ON "scd_currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_name_key" ON "scd_languages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_code_key" ON "scd_languages"("code");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_user_id_status_idx" ON "scd_identity_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_status_idx" ON "scd_identity_verifications"("status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_user_id_status_idx" ON "scd_agency_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_status_idx" ON "scd_agency_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_portfolios_unique_id_key" ON "scd_portfolios"("unique_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_user_id_status_idx" ON "scd_portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_portfolios_status_idx" ON "scd_portfolios"("status");

-- CreateIndex
CREATE INDEX "scd_portfolios_industry_id_idx" ON "scd_portfolios"("industry_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_deleted_at_idx" ON "scd_portfolios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investor_portfolios_unique_id_key" ON "scd_investor_portfolios"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_user_id_status_idx" ON "scd_investor_portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_status_idx" ON "scd_investor_portfolios"("status");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_industry_id_idx" ON "scd_investor_portfolios"("industry_id");

-- CreateIndex
CREATE INDEX "scd_investor_portfolios_deleted_at_idx" ON "scd_investor_portfolios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_unique_id_key" ON "scd_investment_profiles"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_user_id_key" ON "scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profiles_user_id_idx" ON "scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_investment_prof_idx" ON "scd_investment_profile_preferred_industries"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_industry_id_idx" ON "scd_investment_profile_preferred_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profile_committee_members_unique_id_key" ON "scd_investment_profile_committee_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_committee_members_investment_profile_idx" ON "scd_investment_profile_committee_members"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_investment_profile_i_idx" ON "scd_investment_profile_geo_preferences"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_country_id_idx" ON "scd_investment_profile_geo_preferences"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_founder_projects_unique_id_key" ON "scd_founder_projects"("unique_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_user_id_status_idx" ON "scd_founder_projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_status_idx" ON "scd_founder_projects"("status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_expertise_category_id_idx" ON "scd_founder_projects"("expertise_category_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_specialty_id_idx" ON "scd_founder_projects"("specialty_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_deleted_at_idx" ON "scd_founder_projects"("deleted_at");

-- CreateIndex
CREATE INDEX "scd_founder_projects_created_at_idx" ON "scd_founder_projects"("created_at");

-- CreateIndex
CREATE INDEX "scd_project_invites_project_id_idx" ON "scd_project_invites"("project_id");

-- CreateIndex
CREATE INDEX "scd_project_invites_provider_id_idx" ON "scd_project_invites"("provider_id");

-- CreateIndex
CREATE INDEX "scd_project_invites_status_idx" ON "scd_project_invites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_project_invites_project_id_provider_id_key" ON "scd_project_invites"("project_id", "provider_id");

-- CreateIndex
CREATE INDEX "scd_saved_projects_project_id_idx" ON "scd_saved_projects"("project_id");

-- CreateIndex
CREATE INDEX "scd_saved_projects_user_id_idx" ON "scd_saved_projects"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_saved_projects_project_id_user_id_key" ON "scd_saved_projects"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposals_unique_id_key" ON "scd_proposals"("unique_id");

-- CreateIndex
CREATE INDEX "scd_proposals_project_id_idx" ON "scd_proposals"("project_id");

-- CreateIndex
CREATE INDEX "scd_proposals_provider_id_idx" ON "scd_proposals"("provider_id");

-- CreateIndex
CREATE INDEX "scd_proposals_status_idx" ON "scd_proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposals_project_id_provider_id_key" ON "scd_proposals"("project_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_proposal_ndas_proposal_id_key" ON "scd_proposal_ndas"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_unique_id_key" ON "scd_reviews"("unique_id");

-- CreateIndex
CREATE INDEX "scd_reviews_review_to_id_action_type_idx" ON "scd_reviews"("review_to_id", "action_type");

-- CreateIndex
CREATE INDEX "scd_reviews_action_type_action_id_idx" ON "scd_reviews"("action_type", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_review_from_id_review_to_id_action_type_action__key" ON "scd_reviews"("review_from_id", "review_to_id", "action_type", "action_id", "review_type");

-- CreateIndex
CREATE UNIQUE INDEX "scd_milestones_unique_id_key" ON "scd_milestones"("unique_id");

-- CreateIndex
CREATE INDEX "scd_milestones_project_id_idx" ON "scd_milestones"("project_id");

-- CreateIndex
CREATE INDEX "scd_milestones_proposal_id_idx" ON "scd_milestones"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_milestones_proposal_id_order_index_key" ON "scd_milestones"("proposal_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "scd_deliverables_unique_id_key" ON "scd_deliverables"("unique_id");

-- CreateIndex
CREATE INDEX "scd_deliverables_milestone_id_idx" ON "scd_deliverables"("milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_deliverables_milestone_id_order_index_key" ON "scd_deliverables"("milestone_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "scd_conversations_unique_id_key" ON "scd_conversations"("unique_id");

-- CreateIndex
CREATE INDEX "scd_conversations_user1_id_user2_id_idx" ON "scd_conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_conversations_user1_id_user2_id_key" ON "scd_conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_messages_unique_id_key" ON "scd_messages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_messages_conversation_id_created_at_idx" ON "scd_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_schedule_termination_user_id_key" ON "scd_schedule_termination"("user_id");

-- CreateIndex
CREATE INDEX "scd_schedule_termination_scheduled_at_idx" ON "scd_schedule_termination"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_packages_unique_id_key" ON "scd_service_packages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_user_id_idx" ON "scd_service_packages"("user_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_category_id_idx" ON "scd_service_packages"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_sub_category_id_idx" ON "scd_service_packages"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_status_idx" ON "scd_service_packages"("status");

-- CreateIndex
CREATE INDEX "scd_payment_methods_user_id_idx" ON "scd_payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "scd_payment_methods_payment_type_idx" ON "scd_payment_methods"("payment_type");

-- CreateIndex
CREATE INDEX "scd_payment_methods_is_default_idx" ON "scd_payment_methods"("is_default");

-- CreateIndex
CREATE INDEX "scd_payment_methods_razorpay_customer_id_idx" ON "scd_payment_methods"("razorpay_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_bank_information_unique_id_key" ON "scd_bank_information"("unique_id");

-- CreateIndex
CREATE INDEX "scd_bank_information_user_id_idx" ON "scd_bank_information"("user_id");

-- CreateIndex
CREATE INDEX "scd_bank_information_unique_id_idx" ON "scd_bank_information"("unique_id");

-- CreateIndex
CREATE INDEX "scd_bank_information_verification_status_idx" ON "scd_bank_information"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_bank_information_user_id_entity_type_key" ON "scd_bank_information"("user_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "scd_withdrawal_requests_billing_transaction_id_key" ON "scd_withdrawal_requests"("billing_transaction_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_requests_status_idx" ON "scd_withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "scd_withdrawal_requests_withdrawal_trigger_at_idx" ON "scd_withdrawal_requests"("withdrawal_trigger_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_tax_information_user_id_key" ON "scd_tax_information"("user_id");

-- CreateIndex
CREATE INDEX "scd_tax_information_user_id_idx" ON "scd_tax_information"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_unique_id_key" ON "scd_billing_transactions"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_payer_invoice_id_key" ON "scd_billing_transactions"("payer_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_receiver_invoice_id_key" ON "scd_billing_transactions"("receiver_invoice_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_actor_type_actor_id_idx" ON "scd_billing_transactions"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_from_type_from_id_idx" ON "scd_billing_transactions"("from_type", "from_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_to_type_to_id_idx" ON "scd_billing_transactions"("to_type", "to_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_subject_type_subject_id_idx" ON "scd_billing_transactions"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_milestone_id_idx" ON "scd_billing_transactions"("milestone_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_status_idx" ON "scd_billing_transactions"("status");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_created_at_idx" ON "scd_billing_transactions"("created_at");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_unique_id_idx" ON "scd_billing_transactions"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_invoices_invoice_number_key" ON "scd_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "scd_invoices_billing_transaction_id_idx" ON "scd_invoices"("billing_transaction_id");

-- CreateIndex
CREATE INDEX "scd_invoices_invoice_number_idx" ON "scd_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "scd_login_devices_refresh_token_key" ON "scd_login_devices"("refresh_token");

-- CreateIndex
CREATE INDEX "scd_login_devices_user_id_idx" ON "scd_login_devices"("user_id");

-- CreateIndex
CREATE INDEX "scd_login_devices_refresh_token_idx" ON "scd_login_devices"("refresh_token");

-- CreateIndex
CREATE INDEX "scd_login_devices_deleted_at_idx" ON "scd_login_devices"("deleted_at");

-- CreateIndex
CREATE INDEX "scd_notifications_user_id_idx" ON "scd_notifications"("user_id");

-- CreateIndex
CREATE INDEX "scd_notifications_user_id_read_at_idx" ON "scd_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "scd_notifications_created_at_idx" ON "scd_notifications"("created_at");

-- CreateIndex
CREATE INDEX "scd_activities_subject_type_subject_unique_id_created_at_idx" ON "scd_activities"("subject_type", "subject_unique_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "scd_attachments_unique_id_key" ON "scd_attachments"("unique_id");

-- CreateIndex
CREATE INDEX "scd_attachments_owner_user_id_idx" ON "scd_attachments"("owner_user_id");

-- CreateIndex
CREATE INDEX "scd_attachments_unique_id_idx" ON "scd_attachments"("unique_id");

-- CreateIndex
CREATE INDEX "scd_attachments_status_idx" ON "scd_attachments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_redirect_links_code_key" ON "scd_redirect_links"("code");

-- CreateIndex
CREATE INDEX "scd_redirect_links_code_idx" ON "scd_redirect_links"("code");

-- CreateIndex
CREATE INDEX "scd_redirect_links_entity_type_entity_id_idx" ON "scd_redirect_links"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "scd_users" ADD CONSTRAINT "scd_users_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_user_preferences" ADD CONSTRAINT "scd_user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_user_wallets" ADD CONSTRAINT "scd_user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_personal_info" ADD CONSTRAINT "scd_personal_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_personal_info" ADD CONSTRAINT "scd_personal_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_personal_info" ADD CONSTRAINT "scd_personal_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_branch_country_id_fkey" FOREIGN KEY ("branch_country_id") REFERENCES "scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_branch_state_id_fkey" FOREIGN KEY ("branch_state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_funding_rounds" ADD CONSTRAINT "scd_funding_rounds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_raising_funds" ADD CONSTRAINT "scd_raising_funds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_education" ADD CONSTRAINT "scd_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_licenses" ADD CONSTRAINT "scd_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_specialties" ADD CONSTRAINT "scd_specialties_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_skills" ADD CONSTRAINT "scd_skills_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_sub_industries" ADD CONSTRAINT "scd_sub_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_team_members" ADD CONSTRAINT "scd_team_members_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_otps" ADD CONSTRAINT "scd_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_countries" ADD CONSTRAINT "scd_countries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_states" ADD CONSTRAINT "scd_states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_work_experiences" ADD CONSTRAINT "scd_work_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_achievements" ADD CONSTRAINT "scd_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_identity_verifications" ADD CONSTRAINT "scd_identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_agency_verifications" ADD CONSTRAINT "scd_agency_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_portfolios" ADD CONSTRAINT "scd_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_portfolios" ADD CONSTRAINT "scd_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investor_portfolios" ADD CONSTRAINT "scd_investor_portfolios_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profiles" ADD CONSTRAINT "scd_investment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_investment_pro_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_sub_industry_i_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_committee_members" ADD CONSTRAINT "scd_investment_profile_committee_members_investment_profil_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_investment_profile__fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "scd_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_project_invites" ADD CONSTRAINT "scd_project_invites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_project_invites" ADD CONSTRAINT "scd_project_invites_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_saved_projects" ADD CONSTRAINT "scd_saved_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_saved_projects" ADD CONSTRAINT "scd_saved_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_proposals" ADD CONSTRAINT "scd_proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_proposals" ADD CONSTRAINT "scd_proposals_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_proposal_ndas" ADD CONSTRAINT "scd_proposal_ndas_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "scd_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_from_id_fkey" FOREIGN KEY ("review_from_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_to_id_fkey" FOREIGN KEY ("review_to_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_milestones" ADD CONSTRAINT "scd_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_milestones" ADD CONSTRAINT "scd_milestones_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "scd_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_deliverables" ADD CONSTRAINT "scd_deliverables_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "scd_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_messages" ADD CONSTRAINT "scd_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "scd_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_messages" ADD CONSTRAINT "scd_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "scd_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_schedule_termination" ADD CONSTRAINT "scd_schedule_termination_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_service_packages" ADD CONSTRAINT "scd_service_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_service_packages" ADD CONSTRAINT "scd_service_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_service_packages" ADD CONSTRAINT "scd_service_packages_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "scd_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_payment_methods" ADD CONSTRAINT "scd_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_bank_information" ADD CONSTRAINT "scd_bank_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_withdrawal_method_id_fkey" FOREIGN KEY ("withdrawal_method_id") REFERENCES "scd_bank_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_billing_transaction_id_fkey" FOREIGN KEY ("billing_transaction_id") REFERENCES "scd_billing_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_tax_information" ADD CONSTRAINT "scd_tax_information_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "scd_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "scd_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_payer_invoice_id_fkey" FOREIGN KEY ("payer_invoice_id") REFERENCES "scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_receiver_invoice_id_fkey" FOREIGN KEY ("receiver_invoice_id") REFERENCES "scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_login_devices" ADD CONSTRAINT "scd_login_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_notifications" ADD CONSTRAINT "scd_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_notifications" ADD CONSTRAINT "scd_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "scd_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_attachments" ADD CONSTRAINT "scd_attachments_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_attachments" ADD CONSTRAINT "scd_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

