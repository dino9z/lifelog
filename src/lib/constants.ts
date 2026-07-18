import type { IconKey } from '../types'
import {
  Dumbbell,
  BookOpen,
  Code2,
  Droplets,
  Moon,
  Brain,
  Sun,
  Leaf,
  Music,
  PenLine,
  Coffee,
  Heart,
  Footprints,
  Apple,
  Briefcase,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<IconKey, LucideIcon> = {
  dumbbell: Dumbbell,
  book: BookOpen,
  code: Code2,
  droplet: Droplets,
  moon: Moon,
  brain: Brain,
  sun: Sun,
  leaf: Leaf,
  music: Music,
  pen: PenLine,
  coffee: Coffee,
  heart: Heart,
  walk: Footprints,
  food: Apple,
  briefcase: Briefcase,
  sparkles: Sparkles,
}

export const ICON_OPTIONS: IconKey[] = [
  'dumbbell',
  'book',
  'code',
  'droplet',
  'moon',
  'brain',
  'sun',
  'leaf',
  'music',
  'pen',
  'coffee',
  'heart',
  'walk',
  'food',
  'briefcase',
  'sparkles',
]

export const PALETTE: { name: string; value: string }[] = [
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Teal', value: '#2dd4bf' },
  { name: 'Violet', value: '#a78bfa' },
  { name: 'Rose', value: '#fb7185' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Orange', value: '#fb923c' },
]

export const DEFAULT_CATEGORIES = ['Health', 'Fitness', 'Study', 'Reading', 'Personal']
