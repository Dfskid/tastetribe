export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface RestaurantAttributes {
  address?: string
  phone?: string
  website?: string
  cuisine_type?: string
  price_range?: string
  google_places_id?: string
  google_rating?: number
  hours?: Record<string, string>
  image_url?: string
  latitude?: number
  longitude?: number
}

export interface Item {
  id: string
  category: string
  name: string
  attributes: Json
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
