export interface City {
  id: string;
  name: string;
}

export interface District {
  id: string;
  city_id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface Place {
  id: number;
  name: string;
  slug: string;
  city_id: string;
  district_id: string;
  address: string;
  image: string;
  rating: number;
  review_count: number;
  price_range: string;
  categories: string[];
  amenities: string[];
  is_hot: boolean;
  is_new: boolean;
  discount?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  membership: string;
  points: number;
}

export interface Review {
  id: number;
  user_id: number;
  place_id: number;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
}

export interface Database {
  cities: City[];
  districts: District[];
  categories: Category[];
  amenities: Amenity[];
  places: Place[];
  users: User[];
  reviews: Review[];
}
