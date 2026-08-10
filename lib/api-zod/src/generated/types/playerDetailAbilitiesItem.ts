
export type PlayerDetailAbilitiesItem = {
  slot_index?: number;
  title?: string;
  description?: string;
  /** @nullable */
  activation_description?: string | null;
  /** @nullable */
  deactivation_description?: string | null;
  is_passive?: boolean;
  /** @nullable */
  logo_id?: number | null;
  /** @nullable */
  ovr_threshold?: number | null;
};
