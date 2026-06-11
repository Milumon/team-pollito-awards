export interface AvatarConfig {
  skinColor: string;
  hoodieColor: string;
  eyesType: 'smile' | 'wink' | 'starry' | 'cool' | 'cute';
  mouthType: 'happy' | 'bigSmile' | 'laugh' | 'open';
  accessory: 'chickHat' | 'sunglasses' | 'headset' | 'crown' | 'star' | 'none';
  hairColor: string;
}

export interface Nominee {
  id: string;
  name: string;
  displayName?: string;
  avatar: AvatarConfig;
}

export interface Category {
  id: number;
  title: string;
  emoji: string;
  description: string;
  nominees: Nominee[];
  funFact?: string;
  message?: string;
}

export interface VoteState {
  [categoryId: number]: string; // categoryId mapped to nomineeId
}
