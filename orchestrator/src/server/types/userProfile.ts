export type UserSkillCategory =
  | "BI_ANALYTICS"
  | "DATA_ENGINEERING"
  | "CLOUD"
  | "ML_AI"
  | "SOFT"
  | "DOMAIN";

export type UserSkillLevel =
  | "NOTIONS"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export interface UserSkill {
  name: string;
  category: UserSkillCategory;
  level: UserSkillLevel;
  yearsOfExperience?: number;
  isPrimary: boolean;
}

export interface UserProfileData {
  skills: UserSkill[];
  targetRoles: string[];
  targetLocations: string[];
  targetSalaryMin?: number;
  targetSalaryMax?: number;
  experienceYears: number;
  currentTitle?: string;
}

