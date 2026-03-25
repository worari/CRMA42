'use client';

import { useEffect, useRef, useState } from 'react';

export default function SignaturePad({ value, onChange, onAction }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0d3b66';
    ctx.lineWidth = 2;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (event.touches?.length) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) {
      return;
    }
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange(dataUrl);
    onAction?.('success', 'บันทึกลายเซ็นเรียบร้อย');
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    onChange('');
    setHasSignature(false);
    onAction?.('info', 'ล้างลายเซ็นแล้ว');
  };

  const handleUploadSignature = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      setHasSignature(true);
      onAction?.('success', 'อัปโหลดลายเซ็นเรียบร้อย');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-300 bg-white p-2">
        <canvas
          ref={canvasRef}
          className="h-28 w-full touch-none rounded-lg border border-dashed border-slate-300"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{hasSignature ? 'บันทึกลายเซ็นแล้ว' : 'วาดลายเซ็นในกรอบด้านบน'}</span>
        <div className="flex items-center gap-2">
          <label className="ux-btn-secondary cursor-pointer px-3 py-1">
            อัปโหลดไฟล์
            <input type="file" accept="image/*" onChange={handleUploadSignature} className="hidden" />
          </label>
          <button
            type="button"
            onClick={clearSignature}
            className="ux-btn-danger px-3 py-1"
          >
            ล้างลายเซ็น
          </button>
        </div>
      </div>
    </div>
  );
}
