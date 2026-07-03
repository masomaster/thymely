import type { Frequency, RepeatFrom } from './recurrence';

// NOTE: these are `type` aliases (not interfaces) on purpose — supabase-js's
// generic schema constraints require object types with implicit index
// signatures, which interfaces do not provide.

export type PlantCatalogRow = {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string | null;
};

export type Plant = {
  id: string;
  owner_id: string;
  catalog_id: string | null;
  name: string;
  location: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export type ProductType =
  | 'fertilizer'
  | 'insecticide'
  | 'fungicide'
  | 'herbicide'
  | 'amendment'
  | 'action'
  | 'other';

export type Product = {
  id: string;
  owner_id: string;
  name: string;
  type: ProductType;
  notes: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  owner_id: string;
  title: string;
  product_id: string | null;
  frequency: Frequency;
  interval: number;
  repeat_from: RepeatFrom;
  anchor_date: string;
  next_due_date: string;
  active: boolean;
  created_at: string;
};

export type TaskPlant = {
  task_id: string;
  plant_id: string;
};

export type Completion = {
  id: string;
  task_id: string;
  plant_id: string | null;
  completed_on: string;
  notes: string | null;
  created_at: string;
};

export type ShareRow = {
  id: string;
  owner_id: string;
  token: string;
  kind: 'read_only' | 'caretaker';
  expires_at: string | null;
  created_at: string;
};

/** A task joined with its linked plants and product, as used across the UI. */
export type TaskWithRelations = Task & {
  product: Product | null;
  plants: Plant[];
};

/**
 * Minimal Database typing for the supabase-js client, shaped to satisfy the
 * library's GenericSchema (each table needs Row/Insert/Update/Relationships).
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: { id?: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      plant_catalog: {
        Row: PlantCatalogRow;
        Insert: Partial<PlantCatalogRow>;
        Update: Partial<PlantCatalogRow>;
        Relationships: [];
      };
      plants: {
        Row: Plant;
        Insert: Omit<Plant, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Plant>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Task>;
        Relationships: [];
      };
      task_plants: {
        Row: TaskPlant;
        Insert: TaskPlant;
        Update: Partial<TaskPlant>;
        Relationships: [];
      };
      completions: {
        Row: Completion;
        Insert: Omit<Completion, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Completion>;
        Relationships: [];
      };
      shares: {
        Row: ShareRow;
        Insert: Omit<ShareRow, 'id' | 'token' | 'created_at'> & {
          id?: string;
          token?: string;
        };
        Update: Partial<ShareRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_plant_catalog: {
        Args: { query: string; max_results?: number };
        Returns: PlantCatalogRow[];
      };
      get_shared_schedule: {
        Args: { share_token: string };
        Returns: {
          id: string;
          title: string;
          frequency: string;
          interval: number;
          repeat_from: string;
          next_due_date: string;
          active: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
