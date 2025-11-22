export interface CreateUserExpertiseInput {
  expertise_category_id: number;
  specialty_id: number;
  description?: string;
  skills?: string[];
}

export interface UpdateUserExpertiseInput extends CreateUserExpertiseInput {
  id: number;
}

export interface ExpertiseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Specialty {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Skill {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}
