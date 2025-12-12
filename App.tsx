import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import HandController from './components/HandController';
import ParticleSystem from './components/ParticleSystem';
import Controls from './components/Controls';
import { HandState, ShapeType, Point3D } from './types';
import { generateMathShape } from './services/shapeGenerator';

const App: React.FC = () => {
  // State
  const [handState, setHandState] = useState<HandState>({
    isDetected: false,
    position: { x: 0.5, y: 0.5 },
    isPinching: false,
    openness: 0
  });

  const [shapeType, setShapeType] = useState<ShapeType>(ShapeType.Heart);
  const [targetPoints, setTargetPoints] = useState<Point3D[]>([]);
  const [color, setColor] = useState<string>('#f43f5e');
  const [isExploding, setIsExploding] = useState(false);

  // Load initial shape
  useEffect(() => {
    // Only load math shapes here. AI shapes are loaded via callback.
    if (shapeType !== ShapeType.GeminiGenerated && shapeType !== ShapeType.Buddha) {
       setTargetPoints(generateMathShape(shapeType));
    }
  }, [shapeType]);

  const handleHandUpdate = useCallback((state: HandState) => {
    // Smooth the hand state slightly to prevent jitter
    setHandState(prev => ({
        ...state,
        openness: prev.openness * 0.7 + state.openness * 0.3, // Smoother transitions
        position: {
            x: prev.position.x * 0.7 + state.position.x * 0.3,
            y: prev.position.y * 0.7 + state.position.y * 0.3,
        }
    }));
  }, []);

  const handleClap = useCallback(() => {
    if (isExploding) return;

    // Trigger explosion
    setIsExploding(true);

    // After 0.5s, change shape and stop exploding
    setTimeout(() => {
        // Pick random shape from math presets
        const shapes = Object.values(ShapeType).filter(s => 
            s !== ShapeType.GeminiGenerated && 
            s !== ShapeType.Buddha &&
            s !== shapeType // Try to pick a new one
        );
        
        // Safety check if filter removed everything (shouldn't happen)
        const availableShapes = shapes.length > 0 ? shapes : Object.values(ShapeType).filter(s => typeof s === 'string');
        const nextShape = availableShapes[Math.floor(Math.random() * availableShapes.length)] as ShapeType;
        
        setShapeType(nextShape);
        setTargetPoints(generateMathShape(nextShape));
        
        // Randomize color too for fun
        const colors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#ffffff'];
        setColor(colors[Math.floor(Math.random() * colors.length)]);

        setIsExploding(false);
    }, 500);
  }, [isExploding, shapeType]);

  const handleShapeChange = (type: ShapeType, points?: Point3D[]) => {
    setShapeType(type);
    if (points) {
        setTargetPoints(points);
    } else {
        setTargetPoints(generateMathShape(type));
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#ADD8E6] overflow-hidden">
      
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <color attach="background" args={['#ADD8E6']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={color} />
        
        {/* Particles */}
        <ParticleSystem 
          targetPoints={targetPoints} 
          handState={handState}
          color={color}
          isExploding={isExploding}
        />
        
        {/* Post Processing / Env */}
        <Environment preset="city" />
        
        {/* Orbit controls enabled only when hand is not detected to allow manual inspection */}
        <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={!handState.isDetected}
            autoRotate={!handState.isDetected} 
            autoRotateSpeed={0.5} 
        />
      </Canvas>

      {/* Hand Tracking Logic (Invisible/Overlay) */}
      <HandController 
        onHandUpdate={handleHandUpdate} 
        onClap={handleClap}
      />

      {/* UI Controls */}
      <Controls 
        currentShape={shapeType} 
        onShapeChange={handleShapeChange} 
        color={color} 
        onColorChange={setColor}
      />

    </div>
  );
};

export default App;