import React, { useState } from 'react';
import { ShapeType } from '../types';
import { Wand2, Loader2, Hand, Zap, LogOut } from 'lucide-react';
import { generateShapePoints } from '../services/geminiService';
import { Point3D } from '../types';

interface ControlsProps {
  currentShape: ShapeType;
  onShapeChange: (shape: ShapeType, points?: Point3D[]) => void;
  color: string;
  onColorChange: (color: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
    currentShape, 
    onShapeChange, 
    color, 
    onColorChange,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const presets = [
    { type: ShapeType.Heart, label: 'Heart' },
    { type: ShapeType.Flower, label: 'Flower' },
    { type: ShapeType.Saturn, label: 'Saturn' },
    { type: ShapeType.Fireworks, label: 'Fireworks' },
    { type: ShapeType.Cube, label: 'Cube' },
  ];

  const handleBuddhaClick = async () => {
    setIsGenerating(true);
    const points = await generateShapePoints("Sitting Buddha Statue Outline");
    onShapeChange(ShapeType.Buddha, points);
    setIsGenerating(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsGenerating(true);
    const points = await generateShapePoints(customPrompt);
    onShapeChange(ShapeType.GeminiGenerated, points);
    setIsGenerating(false);
  };

  const colors = ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#ffffff'];

  return (
    <div className="absolute top-0 left-0 h-full w-full pointer-events-none p-6 flex flex-col justify-between">
      
      {/* Header / Instructions */}
      <div className="pointer-events-auto max-w-md">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
          Gemini Kinetic
        </h1>
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 text-sm text-slate-300 shadow-xl">
            <div className="flex items-start gap-3 mb-2">
                <Hand className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                    <p><span className="text-white font-semibold">Hand Controls:</span></p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-cyan-100/80 text-xs">
                        <li><span className="text-white">Open Palm:</span> Expand Shape</li>
                        <li><span className="text-white">Fist:</span> Compress/Implode</li>
                        <li><span className="text-white">Pinch:</span> Move Shape</li>
                        <li><span className="text-white">Flat Palm Move:</span> Rotate</li>
                    </ul>
                </div>
            </div>
            <div className="flex items-start gap-3 mt-3 pt-3 border-t border-slate-700">
                <Zap className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                    <p><span className="text-white font-semibold">Explode & Switch:</span></p>
                    <div className="grid grid-cols-1 gap-1 mt-1 text-cyan-100/80 text-xs">
                         <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                            <span><b>Bring</b> two hands together</span>
                         </div>
                    </div>
                </div>
            </div>
            
        </div>
      </div>

      {/* Main Controls Panel */}
      <div className="pointer-events-auto self-start mt-auto space-y-4 max-w-xs w-full">
        
        {/* Shape Selector */}
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Templates</h3>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.type}
                onClick={() => onShapeChange(preset.type)}
                className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                  currentShape === preset.type
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
                onClick={handleBuddhaClick}
                disabled={isGenerating}
                className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 border flex items-center justify-center gap-1 ${
                  currentShape === ShapeType.Buddha
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
            >
                {isGenerating && currentShape === ShapeType.Buddha ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buddha'}
            </button>
          </div>
        </div>

        {/* Gemini Generator */}
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
             <Wand2 className="w-3 h-3 text-purple-400" />
             AI Shape Generator
           </h3>
           <form onSubmit={handleGenerate} className="flex gap-2">
             <input
               type="text"
               value={customPrompt}
               onChange={(e) => setCustomPrompt(e.target.value)}
               placeholder="e.g. A dragon, A spiral..."
               className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 placeholder-slate-500"
             />
             <button 
               type="submit" 
               disabled={isGenerating}
               className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
             </button>
           </form>
           {currentShape === ShapeType.GeminiGenerated && (
             <p className="text-[10px] text-purple-300 mt-2 text-right italic">Generated by Gemini 2.5 Flash</p>
           )}
        </div>

        {/* Color Picker */}
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Particle Color</h3>
          <div className="flex gap-2 flex-wrap">
             {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? 'border-white scale-110 shadow-[0_0_10px_currentColor]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, color: c }}
                  aria-label={`Select color ${c}`}
                />
             ))}
             <input 
               type="color" 
               value={color} 
               onChange={(e) => onColorChange(e.target.value)}
               className="w-6 h-6 rounded-full overflow-hidden p-0 border-0 cursor-pointer"
             />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Controls;