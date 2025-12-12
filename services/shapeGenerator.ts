import { Point3D, ShapeType } from "../types";
import * as THREE from 'three';

const COUNT = 1500;

export const generateMathShape = (type: ShapeType): Point3D[] => {
  const points: Point3D[] = [];

  switch (type) {
    case ShapeType.Sphere:
      for (let i = 0; i < COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 1;
        points.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
        });
      }
      break;

    case ShapeType.Cube:
      for (let i = 0; i < COUNT; i++) {
        points.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
        });
      }
      break;

    case ShapeType.Heart:
      for (let i = 0; i < COUNT; i++) {
        // Heart shape parametric equations
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI; // distribution fix needed for volume, but surface is fine for particles
        // More robust heart formula
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 5; // Thickness
        // Normalize roughly to -1 to 1
        points.push({ x: x / 20, y: y / 20, z: z / 20 });
      }
      break;

    case ShapeType.Flower:
      for (let i = 0; i < COUNT; i++) {
        // Rose curve / Phyllotaxis
        const r = Math.sqrt(i / COUNT);
        const theta = i * 2.39996; // Golden angle approx
        const petality = Math.sin(theta * 5); // 5 petals
        
        const x = r * Math.cos(theta) * (0.5 + 0.5 * petality);
        const y = r * Math.sin(theta) * (0.5 + 0.5 * petality);
        const z = (Math.random() - 0.5) * 0.5;
        points.push({ x: x * 1.5, y: y * 1.5, z });
      }
      break;
    
    case ShapeType.Saturn:
        // Planet
        for (let i = 0; i < COUNT * 0.4; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 0.4;
            points.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
            });
        }
        // Rings
        for (let i = 0; i < COUNT * 0.6; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = 0.6 + Math.random() * 0.4;
            points.push({
                x: r * Math.cos(theta),
                y: (Math.random() - 0.5) * 0.05, // Flat rings
                z: r * Math.sin(theta),
            });
        }
        break;

    case ShapeType.Fireworks:
        for (let i = 0; i < COUNT; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = Math.random(); // Solid ball volume
            points.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
            });
        }
        break;

    default:
        // Default to sphere
        return generateMathShape(ShapeType.Sphere);
  }
  return points;
};
