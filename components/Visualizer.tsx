import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let currentVol = 0; 

    const draw = () => {
      // Smooth out the volume
      currentVol += (volume - currentVol) * 0.2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isActive) {
        return;
      }

      const centerY = canvas.height / 2;
      const bars = 20; // Fewer bars for a cleaner look
      const spacing = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const x = i * spacing + spacing / 2;
        // Calculate height based on volume and sine wave for movement
        const wave = Math.sin(Date.now() / 150 + i * 0.5);
        const height = Math.max(2, currentVol * 15 * (wave + 2));
        
        ctx.fillStyle = '#3b82f6'; // Blue-500
        
        // Draw rounded pill bars
        const barWidth = 4;
        const barHeight = Math.min(height, canvas.height);
        
        // Top half
        ctx.beginPath();
        ctx.roundRect(x - barWidth/2, centerY - barHeight/2, barWidth, barHeight, 4);
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={32} 
      className="opacity-80"
    />
  );
};

export default Visualizer;