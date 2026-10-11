import type { Movie } from '../types/movie';

// Authentic film artwork is sourced from TMDB and stored in project storage for reliable loading.
export const movies: Movie[] = [
  {
    id: 'interstellar', title: 'Interstellar',
    poster: '/legacy-assets/interstellar_clean_poster.jpg', backdrop: '/legacy-assets/interstellar_clean_backdrop.jpg',
    rating: 8.7, genres: ['Sci-Fi', 'Drama', 'Adventure'], language: 'English', duration: '2h 49m', releaseDate: '2014-11-07',
    description: 'A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.',
    cast: [
      { name: 'Matthew McConaughey', character: 'Cooper', image: '/legacy-assets/matthew-mcconaughey_cab32c46.jpg' },
      { name: 'Anne Hathaway', character: 'Brand', image: '/legacy-assets/anne-hathaway_68adce29.jpg' },
      { name: 'Jessica Chastain', character: 'Murph', image: '/legacy-assets/jessica-chastain_da840d03.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/zSWdZVtXT7E', status: 'now-showing',
  },
  {
    id: 'inception', title: 'Inception',
    poster: '/legacy-assets/inception_fd36e5b2.jpg', backdrop: '/legacy-assets/inception_edcd8ad8.jpg',
    rating: 8.4, genres: ['Action', 'Sci-Fi', 'Thriller'], language: 'English', duration: '2h 28m', releaseDate: '2010-07-16',
    description: 'A skilled thief who steals secrets through dreams is offered a chance to make his past disappear.',
    cast: [
      { name: 'Leonardo DiCaprio', character: 'Cobb', image: '/legacy-assets/inception-leonardo-dicaprio_9248e8f1.jpg' },
      { name: 'Joseph Gordon-Levitt', character: 'Arthur', image: '/legacy-assets/inception-joseph-gordon-levitt_b9fcdf18.jpg' },
      { name: 'Elliot Page', character: 'Ariadne', image: '/legacy-assets/inception-elliot-page_73db8878.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/YoHD9XEInc0', status: 'now-showing',
  },
  {
    id: 'dune-part-two', title: 'Dune: Part Two',
    poster: '/legacy-assets/dune-part-two_d46c1f84.jpg', backdrop: '/legacy-assets/dune-part-two_e0bf054a.jpg',
    rating: 8.3, genres: ['Action', 'Adventure', 'Sci-Fi'], language: 'English', duration: '2h 46m', releaseDate: '2024-03-01',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    cast: [
      { name: 'Timothée Chalamet', character: 'Paul Atreides', image: '/legacy-assets/dune-part-two-timothee-chalamet_607aef23.jpg' },
      { name: 'Zendaya', character: 'Chani', image: '/legacy-assets/dune-part-two-zendaya_75f457a1.jpg' },
      { name: 'Rebecca Ferguson', character: 'Lady Jessica', image: '/legacy-assets/dune-part-two-rebecca-ferguson_ac3dd170.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/Way9Dexny3w', status: 'coming-soon',
  },
  {
    id: 'the-batman', title: 'The Batman',
    poster: '/legacy-assets/the-batman_b16c2b07.jpg', backdrop: '/legacy-assets/the-batman_46828fe9.jpg',
    rating: 7.7, genres: ['Action', 'Crime', 'Mystery'], language: 'English', duration: '2h 56m', releaseDate: '2022-03-04',
    description: 'Batman investigates a series of cryptic crimes that draw him into the darkest corners of Gotham City.',
    cast: [
      { name: 'Robert Pattinson', character: 'Bruce Wayne' },
      { name: 'Zoë Kravitz', character: 'Selina Kyle' },
      { name: 'Paul Dano', character: 'The Riddler' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/mqqft2x_Aa4', status: 'now-showing',
  },
  {
    id: 'across-the-spider-verse', title: 'Spider-Man: Across the Spider-Verse',
    poster: '/legacy-assets/spider-verse_d1ab8571.jpg', backdrop: '/legacy-assets/spider-verse_aef2ff4b.jpg',
    rating: 8.4, genres: ['Action', 'Adventure', 'Animation'], language: 'English', duration: '2h 20m', releaseDate: '2023-06-02',
    description: 'Miles Morales swings across the multiverse and encounters a team of Spider-people protecting its very existence.',
    cast: [
      { name: 'Shameik Moore', character: 'Miles Morales', image: '/legacy-assets/across-the-spider-verse-shameik-moore_2ae2a4b4.jpg' },
      { name: 'Hailee Steinfeld', character: 'Gwen Stacy', image: '/legacy-assets/across-the-spider-verse-hailee-steinfeld_16c5c1ec.jpg' },
      { name: 'Brian Tyree Henry', character: 'Jeff Morales', image: '/legacy-assets/across-the-spider-verse-brian-tyree-henry_1937c019.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/shW9i6k8cB0', status: 'now-showing',
  },
  {
    id: 'oppenheimer', title: 'Oppenheimer',
    poster: '/legacy-assets/oppenheimer_9650aad3.jpg', backdrop: '/legacy-assets/oppenheimer_be8200e9.jpg',
    rating: 8.1, genres: ['Drama', 'History', 'Thriller'], language: 'English', duration: '3h 00m', releaseDate: '2023-07-21',
    description: 'The story of J. Robert Oppenheimer and the scientific, political and personal consequences of creating the atomic bomb.',
    cast: [
      { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', image: '/legacy-assets/oppenheimer-cillian-murphy_7c8ac7af.jpg' },
      { name: 'Emily Blunt', character: 'Kitty Oppenheimer', image: '/legacy-assets/oppenheimer-emily-blunt_f0e4daaa.jpg' },
      { name: 'Robert Downey Jr.', character: 'Lewis Strauss', image: '/legacy-assets/oppenheimer-robert-downey-jr_97d7538d.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/bK6ldnjE3Y0', status: 'now-showing',
  },
  {
    id: 'everything-everywhere', title: 'Everything Everywhere All at Once',
    poster: '/legacy-assets/everything-everywhere_3a1cd282.jpg', backdrop: '/legacy-assets/everything-everywhere_375b68a7.jpg',
    rating: 7.8, genres: ['Action', 'Adventure', 'Comedy'], language: 'English', duration: '2h 19m', releaseDate: '2022-03-25',
    description: 'An exhausted laundromat owner discovers that she must connect with alternate versions of herself to save the multiverse.',
    cast: [
      { name: 'Michelle Yeoh', character: 'Evelyn Wang', image: '/legacy-assets/everything-everywhere-michelle-yeoh_1a7b0802.jpg' },
      { name: 'Stephanie Hsu', character: 'Joy Wang', image: '/legacy-assets/everything-everywhere-stephanie-hsu_586a1cb2.jpg' },
      { name: 'Ke Huy Quan', character: 'Waymond Wang', image: '/legacy-assets/everything-everywhere-ke-huy-quan_b33ff503.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/wxN1T1uxQ2g', status: 'coming-soon',
  },
  {
    id: 'barbie', title: 'Barbie',
    poster: '/legacy-assets/barbie_cd2c6d81.jpg', backdrop: '/legacy-assets/barbie_4d3063a3.jpg',
    rating: 7.0, genres: ['Comedy', 'Adventure', 'Fantasy'], language: 'English', duration: '1h 54m', releaseDate: '2023-07-21',
    description: 'Barbie and Ken leave their perfect world behind and discover the joys and challenges of life in the real world.',
    cast: [
      { name: 'Margot Robbie', character: 'Barbie', image: '/legacy-assets/barbie-margot-robbie_fa2a1d1b.jpg' },
      { name: 'Ryan Gosling', character: 'Ken', image: '/legacy-assets/barbie-ryan-gosling_f6e0733c.jpg' },
      { name: 'America Ferrera', character: 'Gloria', image: '/legacy-assets/barbie-america-ferrera_78c1e5da.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/pBk4NYhWNMM', status: 'now-showing',
  },
  {
    id: 'top-gun-maverick', title: 'Top Gun: Maverick',
    poster: '/legacy-assets/top-gun-maverick_76757258.jpg', backdrop: '/legacy-assets/top-gun-maverick_9df5f67f.jpg',
    rating: 8.2, genres: ['Action', 'Drama'], language: 'English', duration: '2h 11m', releaseDate: '2022-05-27',
    description: 'After decades of service, Maverick confronts a new generation of pilots and the limits of his own past.',
    cast: [
      { name: 'Tom Cruise', character: 'Maverick', image: '/legacy-assets/top-gun-maverick-tom-cruise_a17dd50f.jpg' },
      { name: 'Miles Teller', character: 'Rooster', image: '/legacy-assets/top-gun-maverick-miles-teller_12ae5e91.jpg' },
      { name: 'Jennifer Connelly', character: 'Penny', image: '/legacy-assets/top-gun-maverick-jennifer-connelly_70529585.jpg' },
    ],
    trailerUrl: 'https://www.youtube-nocookie.com/embed/qSqVVswa420', status: 'coming-soon',
  },
  {
    id: 'kantara', title: 'Kantara',
    poster: '/legacy-assets/kantara_713e54ce.jpg', backdrop: '/legacy-assets/kantara_f735139c.jpg',
    rating: 7.2, genres: ['Action', 'Drama', 'Thriller'], language: 'Kannada', duration: '2h 28m', releaseDate: '2022-09-30',
    description: 'In coastal Karnataka, a forest guard’s conflict with a village leader becomes entwined with ancient custom and belief.',
    cast: [
      { name: 'Rishab Shetty', character: 'Shiva', image: '/legacy-assets/kantara-rishab-shetty_db3e153b.jpg' },
      { name: 'Sapthami Gowda', character: 'Leela', image: '/legacy-assets/kantara-sapthami-gowda_638e2a46.jpg' },
      { name: 'Kishore', character: 'Murali', image: '/legacy-assets/kantara-kishore_c9ebe84a.jpg' },
    ],
    status: 'now-showing',
  },
  {
    id: 'kgf-chapter-two', title: 'K.G.F: Chapter 2',
    poster: '/legacy-assets/kgf-chapter-two_377148c7.jpg', backdrop: '/legacy-assets/kgf-chapter-2_73c876a8.jpg',
    rating: 7.4, genres: ['Action', 'Drama', 'Crime'], language: 'Kannada', duration: '2h 48m', releaseDate: '2022-04-14',
    description: 'Rocky rules Kolar Gold Fields as new enemies and political pressure threaten the empire he built.',
    cast: [
      { name: 'Yash', character: 'Rocky', image: '/legacy-assets/kgf-chapter-two-yash_37949f0d.jpg' },
      { name: 'Sanjay Dutt', character: 'Adheera', image: '/legacy-assets/kgf-chapter-two-sanjay-dutt_40db03b8.jpg' },
      { name: 'Srinidhi Shetty', character: 'Reena', image: '/legacy-assets/kgf-chapter-two-srinidhi-shetty_e180cb7a.jpg' },
    ],
    status: 'now-showing',
  },
  {
    id: 'jawan', title: 'Jawan',
    poster: '/legacy-assets/jawan_309b4856.jpg', backdrop: '/legacy-assets/jawan_26b404d9.jpg',
    rating: 7.2, genres: ['Action', 'Thriller'], language: 'Hindi', duration: '2h 49m', releaseDate: '2023-09-07',
    description: 'A prison warden leads a group of women through a high-stakes mission that challenges corruption and injustice.',
    cast: [
      { name: 'Shah Rukh Khan', character: 'Vikram Rathore', image: '/legacy-assets/jawan-shah-rukh-khan_a5603552.jpg' },
      { name: 'Nayanthara', character: 'Narmada', image: '/legacy-assets/jawan-nayanthara_0c14bd21.jpg' },
      { name: 'Vijay Sethupathi', character: 'Kalee', image: '/legacy-assets/jawan-vijay-sethupathi_42f20455.jpg' },
    ],
    status: 'coming-soon',
  },
];
