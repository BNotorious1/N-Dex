
export interface TeamInput {
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  overall_rating?: number;
  is_user_team?: boolean;
  primary_color?: string;
  secondary_color?: string;
}
