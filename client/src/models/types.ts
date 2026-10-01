export interface User {
  id: number;
  username: string;
}

import type { Helpline, Mood } from '@shared/chat';

export type { Mood };

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bubble';
  timestamp: Date;
  mood?: Mood;
  kind?: 'breathing-offer';
  // shown as a call card under the message when the user may be in crisis
  helplines?: Helpline[];
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  mood: Mood;
  createdAt: Date;
}

export interface MoodData {
  mood: Mood;
  timestamp: Date;
  value: number; // A value between 0-100 representing the intensity
}

export interface Environment {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
  sceneUrl?: string; // URL to 3D scene if available
}

export interface AvatarCustomization {
  faceShape: 'round' | 'square' | 'triangle';
  eyeStyle: 'default' | 'happy' | 'cool';
  color: string;
  accessories: string[];
}

export interface Reminder {
  id: number;
  title: string;
  description?: string;
  time: Date;
}

export interface WebSocketMessage {
  type: 'chat' | 'mood' | 'reminder' | 'system';
  payload: any;
}
