export interface Theatre {
  id: string;
  name: string;
  area: string;
  city: string;
  distance: string;
  formats: string[];
  ticketPrice: number;
  screen: string;
}

// Prototype venue data only; names, distances and inventory are not live listings.
export const theatres: Theatre[] = [
  {
    id: 'inox-camp-road',
    name: 'INOX',
    area: 'Camp Road',
    city: 'Belagavi',
    distance: '2.4 km',
    formats: ['2D', 'Dolby Atmos'],
    ticketPrice: 260,
    screen: 'Screen 4',
  },
  {
    id: 'nucleus-mall',
    name: 'Nucleus Mall Cinema',
    area: 'Angol Road',
    city: 'Belagavi',
    distance: '3.1 km',
    formats: ['2D', '3D'],
    ticketPrice: 230,
    screen: 'Screen 2',
  },
  {
    id: 'vijay-theatre',
    name: 'Vijay Cinema',
    area: 'Tilakwadi',
    city: 'Belagavi',
    distance: '1.8 km',
    formats: ['2D'],
    ticketPrice: 190,
    screen: 'Screen 1',
  },
];
