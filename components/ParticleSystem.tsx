import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Point3D, HandState } from '../types';

interface ParticleSystemProps {
  targetPoints: Point3D[];
  handState: HandState;
  color: string;
  isExploding: boolean;
}

const COUNT = 1500; // Total particles in pool

const ParticleSystem: React.FC<ParticleSystemProps> = ({ 
  targetPoints, 
  handState,
  color,
  isExploding
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // To calculate rotation delta
  const prevHandPos = useRef<{ x: number, y: number } | null>(null);

  // Initialize particles with random positions
  const currentPositions = useRef<Point3D[]>([]);

  useEffect(() => {
    // Fill current positions if empty
    if (currentPositions.current.length === 0) {
        currentPositions.current = new Array(COUNT).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 5,
            y: (Math.random() - 0.5) * 5,
            z: (Math.random() - 0.5) * 5,
        }));
    }
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;

    const { viewport } = state;
    const time = state.clock.getElapsedTime();
    const { isDetected, position, isPinching, openness } = handState;

    if (isExploding) {
        // --- EXPLOSION LOGIC ---
        // Optimization: Removed per-frame random() calls to prevent jitter/stutter.
        // Used deterministic expansion based on particle index.
        const baseSpeed = 1.08; 
        
        for (let i = 0; i < COUNT; i++) {
            const current = currentPositions.current[i];
            
            // Deterministic variation creates a "layered" explosion effect without noise
            // (i % 10) * 0.002 gives a small spread from 0.000 to 0.018
            const variation = 1.0 + (i % 10) * 0.004; 
            const speed = baseSpeed * variation;
            
            current.x *= speed;
            current.y *= speed;
            current.z *= speed;
            
            dummy.position.set(current.x, current.y, current.z);
            
            const pScale = 0.04;
            dummy.scale.set(pScale, pScale, pScale);
            
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        
        // Rotate group rapidly during explosion
        groupRef.current.rotation.y += 0.2;
        groupRef.current.rotation.z += 0.1;

    } else {
        // --- NORMAL LOGIC ---

        // 1. Move Logic (Pinch)
        if (isDetected && isPinching) {
            // Map normalized coordinates (0..1) to viewport dimensions (-width/2 .. width/2)
            // position.x is 0 (left) to 1 (right). 
            // viewport 0 is center. Left is +w/2 (because of mirror logic previously discussed? 
            // Let's re-verify:
            // MediaPipe X=0 (Left of Cam). Mirrored Canvas draws Right (1-x).
            // We want Object on Right (+X).
            // -(0 - 0.5) = +0.5. (+0.5 * Width) is Right Edge. Correct.
            // MediaPipe X=1 (Right of Cam). Mirrored Canvas draws Left (1-x).
            // We want Object on Left (-X).
            // -(1 - 0.5) = -0.5. (-0.5 * Width) is Left Edge. Correct.
            // Y is inverted (0 is top, 1 is bottom).
            // -(0 - 0.5) = +0.5 (Top). Correct.
            
            const targetX = -(position.x - 0.5) * viewport.width;
            const targetY = -(position.y - 0.5) * viewport.height;
            groupRef.current.position.lerp(new THREE.Vector3(targetX, targetY, 0), 0.15);
        } 
        // Removed logic that resets position to (0,0,0) when not pinching.
        // This allows the shape to stay where it was placed.

        // 2. Rotate Logic (Flat Palm + Movement)
        if (isDetected && !isPinching && openness > 0.6) {
            if (prevHandPos.current) {
                const dx = position.x - prevHandPos.current.x;
                const dy = position.y - prevHandPos.current.y;
                const sensitivity = 5.0;
                groupRef.current.rotation.y += dx * sensitivity;
                groupRef.current.rotation.x += dy * sensitivity;
            }
        } else {
            groupRef.current.rotation.y += 0.001;
        }
        
        // Update previous position
        if (isDetected) {
            prevHandPos.current = position;
        } else {
            prevHandPos.current = null;
        }

        // 3. Expand/Compress Logic
        // When pinching (moving), we lock scale to 1.0 (Normal size) to prevent jitters/resizing.
        let targetScale = 1.0;
        if (isDetected) {
            if (isPinching) {
                targetScale = 1.0;
            } else {
                targetScale = 0.2 + (openness * 1.3);
            }
        } else {
            targetScale = 1.5; // Idle floating size
        }
        
        const lerpSpeed = 0.1;

        // Optimization: Use modulo for target point access
        const targetLen = targetPoints.length || 1; 

        for (let i = 0; i < COUNT; i++) {
            const target = targetPoints[i % targetLen] || { x: 0, y: 0, z: 0 };
            const current = currentPositions.current[i];

            const tx = target.x * targetScale;
            const ty = target.y * targetScale;
            const tz = target.z * targetScale;

            current.x = THREE.MathUtils.lerp(current.x, tx, lerpSpeed);
            current.y = THREE.MathUtils.lerp(current.y, ty, lerpSpeed);
            current.z = THREE.MathUtils.lerp(current.z, tz, lerpSpeed);
            
            // Add life only when not pinching tightly (moving)
            if (isDetected && isPinching) {
                // Stable particles during move
            } else if (isDetected && openness < 0.2) {
                // Breathing effect when compressed
                current.x += (Math.random() - 0.5) * 0.05;
                current.y += (Math.random() - 0.5) * 0.05;
                current.z += (Math.random() - 0.5) * 0.05;
            } else {
                // Idle floating
                current.x += Math.sin(time * 0.5 + i) * 0.002;
                current.y += Math.cos(time * 0.3 + i) * 0.002;
            }

            dummy.position.set(current.x, current.y, current.z);
            
            // Scale particles based on overall shape size
            const effectiveOpenness = isDetected ? (isPinching ? 0.6 : openness) : 1.0;
            const pScale = 0.02 * (0.5 + effectiveOpenness);
            dummy.scale.set(pScale, pScale, pScale);
            
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
       // Flash white during explosion start?
       const finalColor = isExploding ? '#ffffff' : color;
       meshRef.current.material.color.set(finalColor);
       meshRef.current.material.emissive.set(finalColor);
    }
  });

  return (
    <group ref={groupRef}>
        <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial 
            attach="material" 
            color={color} 
            emissive={color}
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.8}
        />
        </instancedMesh>
    </group>
  );
};

export default ParticleSystem;