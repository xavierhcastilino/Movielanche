export type MovieStatus = 'now-showing' | 'coming-soon';

export type Genre =
  | 'Action'
  | 'Adventure'
  | 'Comedy'
  | 'Drama'
  | 'Horror'
  | 'Thriller'
  | 'Sci-Fi'
  | 'Fantasy'
  | 'Animation'
  | 'Crime'
  | 'Mystery'
  | 'Romance'
  | 'History'
  | 'Family'
  | 'Documentary'
  | 'Musical';

export type Language = 'English' | 'Hindi' | 'Kannada' | 'Tamil' | 'Telugu' | 'Malayalam';

export interface CastMember {
  name: string;
  character: string;
  image?: string;
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  rating: number;
  genres: Genre[];
  language: Language;
  duration: string;
  releaseDate: string;
  description: string;
  cast: CastMember[];
  trailerUrl?: string;
  status: MovieStatus;
}
