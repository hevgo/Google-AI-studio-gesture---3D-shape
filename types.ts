export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export enum ShapeType {
  Sphere = 'Sphere',
  Cube = 'Cube',
  Heart = 'Heart',
  Flower = 'Flower',
  Saturn = 'Saturn',
  Fireworks = 'Fireworks',
  Buddha = 'Buddha',
  GeminiGenerated = 'Gemini Generated',
}

export interface ParticleConfig {
  color: string;
  size: number;
  shape: ShapeType;
  points: Point3D[];
  prompt?: string; // For Gemini generated shapes
}

export interface HandState {
  isDetected: boolean;
  position: { x: number; y: number }; // Normalized 0-1
  isPinching: boolean; // Triggers Move
  openness: number; // 0 (fist) to 1 (flat palm). Triggers Expand/Compress
}
