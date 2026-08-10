
export interface TeamUpdate {
  name?: string;
  wins?: number;
  losses?: number;
  ties?: number;
  overall_rating?: number;
  is_user_team?: boolean;
  primary_color?: string;
  secondary_color?: string;
}
