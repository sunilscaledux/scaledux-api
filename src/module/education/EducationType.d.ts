export interface CreateEducationInput {
  school: string;
  degree: string;
  area_of_study: string;
  start_month: string;
  start_year: string;
  end_month?: string;
  end_year?: string;
  is_ongoing: boolean;
  description?: string;
  skills?: string[];
}

export interface UpdateEducationInput extends CreateEducationInput {
  id: number;
}
