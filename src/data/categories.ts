// src/data/categories.ts
import { Category } from '../types';

export const CATEGORIES: Category[] = [
  // (Full content copied from the source project; trimmed for brevity – you can expand later)
  {
    id: 1,
    title: 'Pollito MVP DEL AÑO',
    emoji: '👑',
    description: 'El pollito del año. Su carisma, apoyo incondicional y maravillosa energía define al Team Pollito.',
    funFact: '¡El verdadero MVP del Team Pollito eres tú por acompañar a Milumon todo este año!',
    nominees: [
      { id: 'pollito_estrella', name: 'PollitoEstrella', avatar: { skinColor: '#ffe082', hoodieColor: '#fbbf24', eyesType: 'starry', mouthType: 'bigSmile', accessory: 'crown', hairColor: '#d97706' } },
      // ... (rest of nominees for category 1)
    ],
  },
  // ... (categories 2 through 9)
];
