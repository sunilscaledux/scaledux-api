export type ProfileType = 'freelancer' | 'founder' | 'mentor' | 'investor';

export interface ProfileSummaryInput {
    FirstName: string;
    LastName: string;
    title: string;
    about: string;
}

// Common profile fields for all user types
export interface CommonProfileInput {
    address?: string;
    address_line_2?: string;
    zipCode?: string;
    countryId?: number;
    stateId?: number;
    city?: string;
    website?: string;
    hideEmail?: boolean;
    hidePhone?: boolean;
    links?: Array<{
        platform: string;
        url: string;
    }>;
    languages?: string[];
}

// Founder-specific profile fields
export interface FounderProfileInput {
    company_name?: string;
    company_tagline?: string;
    company_logo?: string;
    company_cover_image?: string;
    year_founded?: number;
    company_size?: string;
    headquarters?: string;
    company_location?: string;
    company_website?: string;
    industry?: string;
    company_type?: string;
    description?: string;
    problem_statement?: string;
    solution?: string;
    target_market?: string;
    unique_value_prop?: string;
    business_model?: string;
    revenue_model?: string;
    funding_stage?: string;
    total_funding?: number;
    seeking_funding?: boolean;
    funding_amount?: number;
    social_links?: Record<string, string>;
}

// Mentor-specific profile fields
export interface MentorProfileInput {
    expertise_areas?: string[];
    mentoring_experience?: number;
    availability?: string;
    session_rate?: number;
}

// Investor-specific profile fields
export interface InvestorProfileInput {
    investment_focus?: string[];
    investment_stage?: string;
    ticket_size_min?: number;
    ticket_size_max?: number;
    portfolio_companies?: string[];
}

// Unified profile input that combines all types
export interface UserProfileInput extends CommonProfileInput {
    profile_type?: ProfileType;
    // Founder fields
    company_name?: string;
    company_tagline?: string;
    company_logo?: string;
    company_cover_image?: string;
    year_founded?: number;
    company_size?: string;
    headquarters?: string;
    company_location?: string;
    company_website?: string;
    industry?: string;
    company_type?: string;
    description?: string;
    problem_statement?: string;
    solution?: string;
    target_market?: string;
    unique_value_prop?: string;
    business_model?: string;
    revenue_model?: string;
    funding_stage?: string;
    total_funding?: number;
    seeking_funding?: boolean;
    funding_amount?: number;
    social_links?: Record<string, string>;
    // Mentor fields
    expertise_areas?: string[];
    mentoring_experience?: number;
    availability?: string;
    session_rate?: number;
    // Investor fields
    investment_focus?: string[];
    investment_stage?: string;
    ticket_size_min?: number;
    ticket_size_max?: number;
    portfolio_companies?: string[];
}

// Legacy interface for backward compatibility
export interface PersonalInfoInput extends CommonProfileInput {}

export interface HourlyRateInput {
    hourly_rate: number;
    currency_id: number;
}

export interface AvailableHoursPerWeekInput {
    available_hours_per_week: number | null;
}

// Response type for user profile
export interface UserProfileResponse {
    id: number;
    user_id: number;
    profile_type: ProfileType;
    // Common fields
    title?: string;
    about?: string;
    address?: string;
    address_line_2?: string;
    city?: string;
    website?: string;
    zipCode?: string;
    hourly_rate?: number;
    available_hours_per_week?: number | null;
    links?: any;
    languages?: any;
    // Founder fields
    company_name?: string;
    company_tagline?: string;
    company_logo?: string;
    company_cover_image?: string;
    year_founded?: number;
    company_size?: string;
    headquarters?: string;
    company_location?: string;
    company_website?: string;
    industry?: string;
    company_type?: string;
    description?: string;
    problem_statement?: string;
    solution?: string;
    target_market?: string;
    unique_value_prop?: string;
    business_model?: string;
    revenue_model?: string;
    funding_stage?: string;
    total_funding?: number;
    seeking_funding?: boolean;
    funding_amount?: number;
    social_links?: any;
    // Mentor fields
    expertise_areas?: any;
    mentoring_experience?: number;
    availability?: string;
    session_rate?: number;
    // Investor fields
    investment_focus?: any;
    investment_stage?: string;
    ticket_size_min?: number;
    ticket_size_max?: number;
    portfolio_companies?: any;
    // Relations
    currency_id?: number;
    country_id?: number;
    state_id?: number;
    created_at: Date;
    updated_at: Date;
}