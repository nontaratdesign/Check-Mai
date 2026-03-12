
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, AreaChart, Area
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, 
  ArrowDown, ArrowLeft, Layers, Activity, FileText, Loader2, Upload, Hammer,
  ChevronDown, ChevronUp, Settings2, Ruler
} from 'lucide-react';
import { SAMANEA_PROPERTIES } from '../constants';
import { extractSimulationData } from '../services/geminiService';
import { SimulatorInputs } from '../types';

type FurnitureType = 'table' | 'bench' | 'shelf' | 'cantilever' | 'chair';
type JointType = 'dowel' | 'mortise_tenon' | 'screw' | 'butterfly' | 'butt';

const JOINT_STRENGTH_MULTIPLIER: Record<JointType, number> = {
  'mortise_tenon': 1.0,
  'dowel': 0.85,
  'butterfly': 0.8,
  'screw': 0.7,
  'butt': 0.4
};

const FurnitureLoadSimulator: React.FC = () => {
  const [inputs, setInputs] = useState<SimulatorInputs>({
    type: 'table',
    length: 180,
    width: 90,
    thickness: 4,
    load: 100,
    legCount: 4,
    legWidth: 8,
    legThickness: 8,
    legHeight: 75,
    apronHeight: 7,
    apronThickness: 2.5,
    stretcherHeight: 0,
    stretcherWidth: 4,
    stretcherThickness: 2.5,
    topOverhang: 10,
    jointType: 'dowel',
    jointThickness: 10,
    jointLength: 40,
    jointWidth: 40,
    jointsPerConnection: 2,
    backrestHeight: 45,
    backrestAngle: 10,
    backrestLoad: 0,
    armrestLoad: 0,
    legAngle: 0,
    shelfTiers: 3,
    seatDepth: 45
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'basic' | 'structural' | 'joints'>('basic');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const data = await extractSimulationData(base64);
        setInputs(prev => ({
          ...prev,
          type: data.furnitureType,
          length: data.lengthCm,
          width: data.widthCm,
          thickness: data.thicknessCm,
          legCount: data.legCount,
          legWidth: data.legWidthCm,
          legThickness: data.legThicknessCm || data.legWidthCm,
          apronHeight: data.apronHeightCm,
          stretcherHeight: data.stretcherHeightCm,
          stretcherWidth: data.stretcherWidthCm,
          stretcherThickness: data.stretcherThicknessCm,
          topOverhang: data.topOverhangCm,
          jointType: data.jointType,
          backrestHeight: data.backrestHeightCm || prev.backrestHeight,
          backrestAngle: data.backrestAngleDeg || prev.backrestAngle,
          legAngle: data.legAngleDeg || prev.legAngle,
          shelfTiers: data.shelfTiers || prev.shelfTiers,
          seatDepth: data.seatDepthCm || prev.seatDepth
        }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Failed to extract data from blueprint.");
    } finally {
      setIsExtracting(false);
    }
  };

  const results = useMemo(() => {
    const overhang = inputs.topOverhang / 100; // m
    const L_raw = (inputs.length / 100) - (2 * overhang); // Effective span between legs
    const L = Math.max(L_raw, 0.1); // Minimum span of 10cm to avoid division by zero/infinity
    const w = inputs.width / 100;  // m
    const t = inputs.thickness / 100; // m
    const ah = inputs.apronHeight / 100; // m
    const at = inputs.apronThickness / 100; // m
    const F = (inputs.type === 'shelf' ? (inputs.load / inputs.shelfTiers) : inputs.load) * 9.81; // N (Load per tier for shelf)
    const F_back = inputs.backrestLoad * 9.81; // N
    const E = SAMANEA_PROPERTIES.moe * 1e6; // Pa
    const MOR = SAMANEA_PROPERTIES.mor * 1e6; // Pa
    const SHEAR_STRENGTH = MOR * 0.1; // Estimated shear strength parallel to grain
    const COMPRESSION_STRENGTH = MOR * 0.6; // Estimated compression strength parallel to grain
    
    // Moment of Inertia (I) and Area (A)
    const I_top = (w * Math.pow(t, 3)) / 12;
    const A_top = w * t;
    const y_top = t / 2;
    
    let I_total = I_top;
    let A_total = A_top;
    let max_y = t / 2;

    if (inputs.type === 'table' || inputs.type === 'bench' || inputs.type === 'chair') {
      const A_apron = 2 * (at * ah);
      const y_apron = t + (ah / 2); 
      
      const y_na = (A_top * y_top + A_apron * y_apron) / (A_top + A_apron);
      
      I_total = (I_top + A_top * Math.pow(y_top - y_na, 2)) + 
                (2 * ((at * Math.pow(ah, 3)) / 12) + A_apron * Math.pow(y_apron - y_na, 2));
      
      A_total = A_top + A_apron;
      max_y = Math.max(y_na, (t + ah) - y_na);
    }

    if (inputs.stretcherHeight > 0) {
      const I_stretcher = 2 * (inputs.stretcherThickness / 100 * Math.pow(inputs.stretcherHeight / 100, 3)) / 12;
      I_total += I_stretcher * 0.05; 
    }
    
    let maxDeflection = 0;
    let maxBendingStress = 0;
    let maxShearStress = 0;
    
    if (inputs.type === 'cantilever') {
      const cantileverL = Math.max(inputs.length / 100, 0.1);
      maxDeflection = (F * Math.pow(cantileverL, 3)) / (3 * E * I_total);
      maxBendingStress = (F * cantileverL * max_y) / I_total;
      maxShearStress = (1.5 * F) / A_total;
    } else {
      maxDeflection = (F * Math.pow(L, 3)) / (48 * E * I_total);
      maxBendingStress = ((F * L / 4) * max_y) / I_total;
      maxShearStress = (1.5 * (F / 2)) / A_total;
    }

    let backrestStress = 0;
    if (inputs.type === 'chair') {
      const h_back = inputs.backrestHeight / 100;
      const angle_rad = (inputs.backrestAngle * Math.PI) / 180;
      const moment_back = F_back * h_back * Math.cos(angle_rad);
      backrestStress = (moment_back * (t / 2)) / I_top;
      maxBendingStress = Math.max(maxBendingStress, backrestStress);
    }

    const jointArea = (inputs.jointThickness / 1000) * (inputs.jointWidth / 1000) * inputs.jointsPerConnection;
    const totalVerticalLoad = (inputs.type === 'shelf' ? inputs.load : (inputs.load + inputs.backrestLoad + inputs.armrestLoad)) * 9.81;
    const jointShearStress = (totalVerticalLoad / inputs.legCount) / jointArea;
    const jointEfficiency = JOINT_STRENGTH_MULTIPLIER[inputs.jointType];
    
    const effectiveMOR = MOR * jointEfficiency;
    const effectiveShear = SHEAR_STRENGTH * jointEfficiency;

    // Leg Analysis
    let legStress = 0;
    let sfLeg = 10;
    const legAngleRad = (inputs.legAngle * Math.PI) / 180;
    const legArea = (inputs.legWidth / 100) * (inputs.legThickness / 100);
    
    if (inputs.type === 'table' || inputs.type === 'bench' || inputs.type === 'chair') {
        // Axial stress in leg increases with angle: F_axial = F_vertical / cos(theta)
        legStress = ((totalVerticalLoad / inputs.legCount) / Math.cos(legAngleRad)) / legArea; 
        sfLeg = COMPRESSION_STRENGTH / (legStress || 1);
    }

    // Safety Factor based on multiple failure modes
    const sfBending = effectiveMOR / (maxBendingStress || 1);
    const sfShear = effectiveShear / (maxShearStress || 1);
    const sfJoint = (MOR * 0.15 * jointEfficiency) / (jointShearStress || 1); 

    const safetyFactor = Math.max(0, Math.min(sfBending, sfShear, sfJoint, sfLeg, 10));
    
    // Max Recommended Load (Minimum of all failure modes)
    let loadBending = 0;
    if (inputs.type === 'cantilever') {
      const cantileverL = Math.max(inputs.length / 100, 0.1);
      loadBending = (effectiveMOR / 2.5 * I_total / max_y / cantileverL) / 9.81;
    } else {
      loadBending = (effectiveMOR / 2.5 * I_total / max_y * 4 / L) / 9.81;
    }
    
    const loadShear = (effectiveShear / 2.5 * A_total / 1.5 * (inputs.type === 'cantilever' ? 1 : 2)) / 9.81;
    // Leg load capacity decreases as angle increases
    const loadLeg = (COMPRESSION_STRENGTH / 2.5 * legArea * inputs.legCount * Math.cos(legAngleRad)) / 9.81;
    const loadJoint = (MOR * 0.15 * jointEfficiency / 2.5 * jointArea * inputs.legCount) / 9.81;

    const maxRecommendedLoad = Math.min(loadBending, loadShear, loadLeg, loadJoint);

    // Stability Check (Tipping Risk)
    // Footprint width increases with leg angle
    const legHeightM = inputs.legHeight / 100;
    const footprintHalfSpan = (L / 2) + (legHeightM * Math.tan(legAngleRad));
    const maxAllowedOverhang = footprintHalfSpan; // Simplified: Load at edge must be within footprint for basic stability
    const isStable = (inputs.topOverhang / 100) < maxAllowedOverhang;

    const isSafe = safetyFactor > 2.0 && isStable;

    return {
      deflectionMM: maxDeflection * 1000,
      stressMPa: maxBendingStress / 1e6,
      jointStressMPa: jointShearStress / 1e6,
      safetyFactor,
      isSafe: isSafe && isStable,
      isStable,
      legStressMPa: legStress / 1e6,
      backrestStressMPa: backrestStress / 1e6,
      tensileStrengthMPa: SAMANEA_PROPERTIES.mor * 0.7,
      tensileStressMPa: maxBendingStress / 1e6,
      maxRecommendedLoad: Math.max(0, maxRecommendedLoad)
    };
  }, [inputs]);

  const visualProps = useMemo(() => {
    const overallLength = Math.max(inputs.length, 10);
    const overallHeight = Math.max(inputs.legHeight + inputs.thickness, 10);
    
    const containerW = 280;
    const containerH = 180;
    const scale = Math.min(containerW / overallLength, containerH / overallHeight);
    
    return {
      width: overallLength * scale,
      height: overallHeight * scale,
      topH: Math.max(inputs.thickness * scale, 2),
      legH: inputs.legHeight * scale,
      legW: Math.max(inputs.legWidth * scale, 2),
      legT: Math.max(inputs.legThickness * scale, 2),
      overhang: inputs.topOverhang * scale,
      apronH: inputs.apronHeight * scale,
      stretcherH: inputs.stretcherHeight * scale,
      backrestH: inputs.backrestHeight * scale,
      scale
    };
  }, [inputs]);

  const chartData = useMemo(() => {
    const data = [];
    const baseLoad = inputs.type === 'shelf' ? (inputs.load / inputs.shelfTiers) : inputs.load;
    const maxPlot = Math.max(baseLoad * 2, 200);
    const step = maxPlot / 10;

    const overhang = inputs.topOverhang / 100;
    const L_raw = (inputs.length / 100) - (2 * overhang);
    const L = Math.max(L_raw, 0.1);
    const w = inputs.width / 100;
    const t = inputs.thickness / 100;
    const ah = inputs.apronHeight / 100;
    const at = inputs.apronThickness / 100;
    const I_top = (w * Math.pow(t, 3)) / 12;
    const A_top = w * t;
    const y_top = t / 2;
    
    let I_total = I_top;

    if (inputs.type === 'table' || inputs.type === 'bench' || inputs.type === 'chair') {
      const A_apron = 2 * (at * ah);
      const y_apron = t + (ah / 2);
      const y_na = (A_top * y_top + A_apron * y_apron) / (A_top + A_apron);
      I_total = (I_top + A_top * Math.pow(y_top - y_na, 2)) + 
                (2 * ((at * Math.pow(ah, 3)) / 12) + A_apron * Math.pow(y_apron - y_na, 2));
    }

    if (inputs.stretcherHeight > 0) {
      const I_stretcher = 2 * (inputs.stretcherThickness / 100 * Math.pow(inputs.stretcherHeight / 100, 3)) / 12;
      I_total += I_stretcher * 0.1;
    }

    const E = SAMANEA_PROPERTIES.moe * 1e6;

    for (let l = 0; l <= maxPlot; l += step) {
      const F = l * 9.81;
      let def = 0;
      if (inputs.type === 'cantilever') {
        const cantileverL = inputs.length / 100;
        def = (F * Math.pow(cantileverL, 3)) / (3 * E * I_total);
      } else {
        def = (F * Math.pow(L, 3)) / (48 * E * I_total);
      }
      data.push({
        load: Math.round(l),
        deflection: Number((def * 1000).toFixed(2)),
      });
    }
    return data;
  }, [inputs]);

  const [shakeKey, setShakeKey] = useState(0);
  useEffect(() => {
    setShakeKey(prev => prev + 1);
  }, [inputs]);

  const shakeVariants = {
    shake: {
      x: [0, -1, 1, -1, 1, 0],
      transition: { duration: 0.2 }
    },
    danger: {
      x: [0, -2, 2, -2, 2, 0],
      transition: { repeat: Infinity, duration: 0.3 }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Blueprint Upload Section */}
      <div className="bg-wood-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-wood-700 p-3 rounded-2xl">
            <FileText className="w-8 h-8 text-wood-100" />
          </div>
          <div>
            <h2 className="text-xl font-bold">โหมดวิเคราะห์แบบแปลน (Blueprint)</h2>
            <p className="text-wood-300 text-sm">อัปโหลดไฟล์ PDF หรือรูปภาพเพื่อดึงข้อมูลขนาดและการเข้าไม้โดยอัตโนมัติ</p>
          </div>
        </div>
        
        <label className="cursor-pointer bg-wood-100 text-wood-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-colors">
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังดึงข้อมูล...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              อัปโหลดแบบแปลน
            </>
          )}
          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={isExtracting} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* 1. Basic Dimensions */}
          <div className="bg-white rounded-2xl shadow-sm border border-wood-200 overflow-hidden">
            <button 
              onClick={() => setExpandedSection(expandedSection === 'basic' ? 'basic' : 'basic')}
              className="w-full p-4 flex items-center justify-between bg-wood-50 border-b border-wood-100"
            >
              <h3 className="text-sm font-bold text-wood-900 flex items-center">
                <Ruler className="w-4 h-4 mr-2 text-wood-600" />
                1. ขนาดพื้นฐาน (Basic Dimensions)
              </h3>
              {expandedSection === 'basic' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {expandedSection === 'basic' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ประเภทโครงสร้าง (Structure Type)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['table', 'bench', 'shelf', 'cantilever', 'chair'] as FurnitureType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setInputs(prev => ({ ...prev, type: t }))}
                        className={`py-2 px-2 rounded-lg text-[10px] font-bold capitalize border transition-all ${
                          inputs.type === t 
                          ? 'bg-wood-600 text-white border-wood-600 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-wood-300'
                        }`}
                      >
                        {t === 'table' ? 'โต๊ะ' : t === 'bench' ? 'ม้านั่ง' : t === 'shelf' ? 'ชั้นวาง' : t === 'cantilever' ? 'คานยื่น' : 'เก้าอี้'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      {inputs.type === 'chair' ? 'ความกว้างที่นั่ง (Seat Width) (cm)' : 'ความยาวช่วงกลาง (Span Length) (cm)'}
                    </label>
                    <input 
                      type="number" min="20" max="400"
                      value={inputs.length}
                      onChange={e => setInputs(prev => ({ ...prev, length: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>
                  
                  {inputs.type === 'chair' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        ความลึกที่นั่ง (Seat Depth) (cm)
                      </label>
                      <input 
                        type="number" min="30" max="80"
                        value={inputs.seatDepth}
                        onChange={e => setInputs(prev => ({ ...prev, seatDepth: Number(e.target.value) }))}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        ความกว้าง/ลึก (Width/Depth) (cm)
                      </label>
                      <input 
                        type="number" min="10" max="200"
                        value={inputs.width}
                        onChange={e => setInputs(prev => ({ ...prev, width: Number(e.target.value) }))}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                      ความหนาวัสดุ (Material Thickness) (cm)
                    </label>
                    <input 
                      type="number" min="1" max="15" step="0.1"
                      value={inputs.thickness}
                      onChange={e => setInputs(prev => ({ ...prev, thickness: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>

                  {inputs.type === 'shelf' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        จำนวนชั้น (Shelf Tiers)
                      </label>
                      <input 
                        type="number" min="1" max="10"
                        value={inputs.shelfTiers}
                        onChange={e => setInputs(prev => ({ ...prev, shelfTiers: Number(e.target.value) }))}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Structural Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-wood-200 overflow-hidden">
            <button 
              onClick={() => setExpandedSection(expandedSection === 'structural' ? 'basic' : 'structural')}
              className="w-full p-4 flex items-center justify-between bg-wood-50 border-b border-wood-100"
            >
              <h3 className="text-sm font-bold text-wood-900 flex items-center">
                <Settings2 className="w-4 h-4 mr-2 text-wood-600" />
                2. รายละเอียดโครงสร้าง (Structural Details)
              </h3>
              {expandedSection === 'structural' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {expandedSection === 'structural' && (
              <div className="p-4 space-y-4">
                {/* Contextual Structural Inputs */}
                {inputs.type === 'cantilever' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความกว้างฐานยึด (Support Width) (cm)</label>
                      <input 
                        type="number"
                        value={inputs.legWidth}
                        onChange={e => setInputs(prev => ({ ...prev, legWidth: Number(e.target.value) }))}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความสูงคานรับท็อป (Apron) (cm)</label>
                        <input 
                          type="number"
                          value={inputs.apronHeight}
                          onChange={e => setInputs(prev => ({ ...prev, apronHeight: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความหนาคานรับท็อป (cm)</label>
                        <input 
                          type="number"
                          value={inputs.apronThickness}
                          onChange={e => setInputs(prev => ({ ...prev, apronThickness: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">จำนวนขา (Legs)</label>
                        <input 
                          type="number"
                          value={inputs.legCount}
                          onChange={e => setInputs(prev => ({ ...prev, legCount: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความกว้างขา (cm)</label>
                        <input 
                          type="number"
                          value={inputs.legWidth}
                          onChange={e => setInputs(prev => ({ ...prev, legWidth: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความหนาขา (cm)</label>
                        <input 
                          type="number"
                          value={inputs.legThickness}
                          onChange={e => setInputs(prev => ({ ...prev, legThickness: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความสูงขา (cm)</label>
                        <input 
                          type="number"
                          value={inputs.legHeight}
                          onChange={e => setInputs(prev => ({ ...prev, legHeight: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">องศาการเอียงขา (deg)</label>
                        <input 
                          type="number"
                          value={inputs.legAngle}
                          onChange={e => setInputs(prev => ({ ...prev, legAngle: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {inputs.type === 'chair' && (
                  <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                    <h4 className="text-[10px] font-bold text-wood-600 uppercase mb-3">รายละเอียดพนักพิง (Backrest)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความสูงพนักพิง (cm)</label>
                        <input 
                          type="number"
                          value={inputs.backrestHeight}
                          onChange={e => setInputs(prev => ({ ...prev, backrestHeight: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">องศาการเอียง (deg)</label>
                        <input 
                          type="number"
                          value={inputs.backrestAngle}
                          onChange={e => setInputs(prev => ({ ...prev, backrestAngle: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {inputs.type !== 'cantilever' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ระยะยื่นท็อป (Overhang) (cm)</label>
                        <input 
                          type="number"
                          value={inputs.topOverhang}
                          onChange={e => setInputs(prev => ({ ...prev, topOverhang: Number(e.target.value) }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="text-[10px] font-bold text-wood-600 uppercase mb-3">รายละเอียดคานรัดขา (Stretcher)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">สูง (cm)</label>
                          <input 
                            type="number"
                            value={inputs.stretcherHeight}
                            onChange={e => setInputs(prev => ({ ...prev, stretcherHeight: Number(e.target.value) }))}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">กว้าง (cm)</label>
                          <input 
                            type="number"
                            value={inputs.stretcherWidth}
                            onChange={e => setInputs(prev => ({ ...prev, stretcherWidth: Number(e.target.value) }))}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">หนา (cm)</label>
                          <input 
                            type="number"
                            value={inputs.stretcherThickness}
                            onChange={e => setInputs(prev => ({ ...prev, stretcherThickness: Number(e.target.value) }))}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3. Joint Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-wood-200 overflow-hidden">
            <button 
              onClick={() => setExpandedSection(expandedSection === 'joints' ? 'basic' : 'joints')}
              className="w-full p-4 flex items-center justify-between bg-wood-50 border-b border-wood-100"
            >
              <h3 className="text-sm font-bold text-wood-900 flex items-center">
                <Hammer className="w-4 h-4 mr-2 text-wood-600" />
                3. รายละเอียดการเข้าไม้ (Joint Details)
              </h3>
              {expandedSection === 'joints' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {expandedSection === 'joints' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ประเภทการเข้าไม้ (Joint Type)</label>
                  <select 
                    value={inputs.jointType}
                    onChange={e => setInputs(prev => ({ ...prev, jointType: e.target.value as JointType }))}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500 bg-gray-50"
                  >
                    <option value="mortise_tenon">Mortise & Tenon (เดือยรู)</option>
                    <option value="dowel">Wooden Dowels (เดือยไม้กลม)</option>
                    <option value="butterfly">Butterfly Key (เดือยผีเสื้อ)</option>
                    <option value="screw">Screws (สกรู)</option>
                    <option value="butt">Butt Joint (ชนชน)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความหนาเดือย (mm)</label>
                    <input 
                      type="number"
                      value={inputs.jointThickness}
                      onChange={e => setInputs(prev => ({ ...prev, jointThickness: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความกว้างเดือย (mm)</label>
                    <input 
                      type="number"
                      value={inputs.jointWidth}
                      onChange={e => setInputs(prev => ({ ...prev, jointWidth: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ความยาวเดือย (mm)</label>
                    <input 
                      type="number"
                      value={inputs.jointLength}
                      onChange={e => setInputs(prev => ({ ...prev, jointLength: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">จำนวนเดือยต่อจุด</label>
                    <input 
                      type="number"
                      value={inputs.jointsPerConnection}
                      onChange={e => setInputs(prev => ({ ...prev, jointsPerConnection: Number(e.target.value) }))}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-wood-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Load Inputs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                <span className="flex items-center"><ArrowDown className="w-3 h-3 mr-1" /> น้ำหนักที่ที่นั่ง (Seat Load) (kg)</span>
              </label>
              <input 
                type="number" min="0" max="1500"
                value={inputs.load}
                onChange={e => setInputs(prev => ({ ...prev, load: Number(e.target.value) }))}
                className="w-full p-3 text-lg font-bold border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-red-600"
              />
            </div>

            {inputs.type === 'chair' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    <span className="flex items-center"><Activity className="w-3 h-3 mr-1" /> น้ำหนักที่พนักพิง (Backrest Load) (kg)</span>
                  </label>
                  <input 
                    type="number" min="0" max="200"
                    value={inputs.backrestLoad}
                    onChange={e => setInputs(prev => ({ ...prev, backrestLoad: Number(e.target.value) }))}
                    className="w-full p-2 text-sm font-bold border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    <span className="flex items-center"><Layers className="w-3 h-3 mr-1" /> น้ำหนักที่เท้าแขน (Armrest Load) (kg)</span>
                  </label>
                  <input 
                    type="number" min="0" max="100"
                    value={inputs.armrestLoad}
                    onChange={e => setInputs(prev => ({ ...prev, armrestLoad: Number(e.target.value) }))}
                    className="w-full p-2 text-sm font-bold border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-blue-600"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-3xl border-2 transition-all ${results.isSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ความแข็งแรงของโครงสร้าง</h2>
                <p className={`text-sm font-medium ${results.isSafe ? 'text-green-700' : 'text-red-700'}`}>
                  {results.isSafe ? 'ปลอดภัย: ดีไซน์ผ่านมาตรฐานของ Moonler' : 'คำเตือน: ตรวจพบความเสี่ยงที่โครงสร้างจะเสียหาย'}
                </p>
              </div>
              {results.isSafe ? (
                <div className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200 animate-pulse">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">การแอ่นตัว (Deflection)</span>
                <span className={`text-xl font-bold ${results.deflectionMM > 10 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {results.deflectionMM.toFixed(1)} <small className="text-xs font-normal">mm</small>
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">แรงเค้นสูงสุด (Max Stress)</span>
                <span className="text-xl font-bold text-gray-800">
                  {results.stressMPa.toFixed(1)} <small className="text-xs font-normal">MPa</small>
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">ค่าความปลอดภัย (Safety Factor)</span>
                <span className={`text-xl font-bold ${results.safetyFactor < 2.0 ? 'text-red-600' : 'text-green-600'}`}>
                  {results.safetyFactor.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">น้ำหนักแนะนำสูงสุด</span>
                <span className="text-xl font-bold text-wood-700">
                  {Math.round(results.maxRecommendedLoad)} <small className="text-xs font-normal">kg</small>
                </span>
              </div>
            </div>

            {!results.isStable && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">คำเตือน: ความเสถียร (Stability Warning)</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    ระยะยื่น (Overhang) มีขนาดใหญ่เกินไปเมื่อเทียบกับความยาวรวม อาจทำให้เฟอร์นิเจอร์พลิกคว่ำได้ง่ายเมื่อรับน้ำหนักที่ปลาย
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-6 flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                ภาพจำลองการเสียรูป (Deformation)
              </h3>
              
              <div className="flex-1 flex items-center justify-center relative py-12 min-h-[300px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Reference Floor */}
                <div className="absolute w-full h-[2px] bg-gray-700 bottom-12"></div>
                
                {/* Furniture Visualization */}
                <motion.div 
                  key={shakeKey}
                  variants={shakeVariants}
                  animate={!results.isSafe ? "danger" : "shake"}
                  className="relative flex flex-col items-center justify-end"
                  style={{ width: visualProps.width, height: visualProps.height + 60 }}
                >
                  {/* Main Structure Container */}
                  <div className="relative w-full h-full flex flex-col items-center justify-end">
                    
                    {/* Shelf Tiers Rendering */}
                    {inputs.type === 'shelf' ? (
                      <div className="w-full h-full flex flex-col justify-between" style={{ paddingBottom: visualProps.legH }}>
                        {Array.from({ length: inputs.shelfTiers }).map((_, idx) => (
                          <motion.div 
                            key={idx}
                            className="w-full bg-wood-500 rounded-sm relative"
                            style={{
                              height: visualProps.topH,
                              transform: `translateY(${Math.min(results.deflectionMM * (1 - idx/inputs.shelfTiers) * 2, 20)}px)`,
                              opacity: 1 - (idx * 0.1)
                            }}
                          >
                            {idx === 0 && (
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className="text-[8px] font-bold text-red-400">{Math.round(inputs.load / inputs.shelfTiers)}kg/tier</span>
                                <ArrowDown className="w-3 h-3 text-red-400 animate-bounce" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      /* Single Top / Seat / Cantilever */
                      <motion.div 
                        className="w-full bg-wood-500 rounded-sm relative z-20"
                        style={{
                          height: visualProps.topH,
                          transform: `translateY(${Math.min(results.deflectionMM * 2, 40)}px) ${inputs.type === 'cantilever' ? 'origin-left' : ''} ${inputs.type === 'cantilever' ? `rotate(${Math.min(results.deflectionMM * 0.5, 15)}deg)` : ''}`,
                          boxShadow: results.isSafe ? 'none' : '0 0 20px rgba(239, 68, 68, 0.4)'
                        }}
                      >
                        {/* Load Indicator */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <span className="text-[10px] font-bold text-red-400 mb-1">{inputs.load}kg</span>
                          <ArrowDown className="w-4 h-4 text-red-400 animate-bounce" />
                        </div>

                        {/* Backrest for Chair */}
                        {inputs.type === 'chair' && (
                          <div 
                            className="absolute bottom-full right-0 w-2 bg-wood-600 rounded-t-sm origin-bottom transition-all duration-500"
                            style={{ 
                              height: visualProps.backrestH,
                              transform: `rotate(${-inputs.backrestAngle}deg)`
                            }}
                          >
                            {/* Backrest Load */}
                            {inputs.backrestLoad > 0 && (
                              <div className="absolute top-4 right-full mr-2 flex items-center">
                                <ArrowLeft className="w-3 h-3 text-orange-400 animate-pulse" />
                                <span className="text-[8px] font-bold text-orange-400 ml-1">{inputs.backrestLoad}kg</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Apron Visualization */}
                        {(inputs.apronHeight > 0) && (
                          <div 
                            className="absolute top-full left-1/2 -translate-x-1/2 bg-wood-700 opacity-60 rounded-b-sm"
                            style={{ 
                              width: `calc(100% - ${visualProps.overhang * 2.2}px)`, 
                              height: visualProps.apronH 
                            }}
                          ></div>
                        )}
                      </motion.div>
                    )}

                    {/* Legs / Support */}
                    <div className="w-full absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: visualProps.legH }}>
                      {inputs.type === 'cantilever' ? (
                        <div 
                          className="bg-gray-700 rounded-r-lg"
                          style={{ width: visualProps.legW, height: '100%' }}
                        >
                          <div className="w-full h-full opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, #333 10px, #333 20px)' }}></div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          {/* Left Leg */}
                          <div 
                            className="bg-wood-800 rounded-sm origin-top transition-all absolute"
                            style={{ 
                              width: visualProps.legW, 
                              height: visualProps.legH,
                              left: visualProps.overhang,
                              transform: `rotate(${inputs.legAngle}deg)` 
                            }}
                          >
                            {/* Stretcher */}
                            {inputs.stretcherHeight > 0 && (
                              <div 
                                className="absolute bg-wood-700 opacity-80"
                                style={{ 
                                  bottom: visualProps.stretcherH,
                                  height: Math.max(visualProps.stretcherH / 4, 2),
                                  width: visualProps.width - (visualProps.overhang * 2), 
                                  left: '100%'
                                }}
                              ></div>
                            )}
                          </div>
                          {/* Right Leg */}
                          <div 
                            className="bg-wood-800 rounded-sm origin-top transition-all absolute"
                            style={{ 
                              width: visualProps.legW, 
                              height: visualProps.legH,
                              right: visualProps.overhang,
                              transform: `rotate(${-inputs.legAngle}deg)` 
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Technical Labels */}
                <div className="absolute top-4 left-4 font-mono text-[10px] text-gray-500 space-y-1">
                  <div>TYPE: {inputs.type.toUpperCase()}</div>
                  <div>SPAN: {inputs.length}cm</div>
                  <div>LOAD: {inputs.load}kg</div>
                  <div className={results.isSafe ? 'text-green-500' : 'text-red-500'}>
                    STATUS: {results.isSafe ? 'OPTIMAL' : 'CRITICAL'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-6 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                กราฟประสิทธิภาพการรับแรง (Performance Curve)
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c67636" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#c67636" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="load" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                    <Tooltip />
                    <ReferenceLine x={inputs.load} stroke="#ef4444" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="deflection" stroke="#c67636" strokeWidth={3} fillOpacity={1} fill="url(#colorDef)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

      {/* Detailed Joint Analysis */}
      <div className="bg-wood-900 p-6 rounded-3xl border border-wood-700 shadow-2xl">
         <h3 className="text-xs font-bold text-wood-400 uppercase mb-6 flex items-center tracking-widest">
           <Hammer className="w-4 h-4 mr-2" />
           การวินิจฉัยฮาร์ดแวร์และวัสดุ (Diagnostics)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
             <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
               <span className="text-wood-400 font-mono text-[10px] uppercase">Tensile Stress vs Strength</span>
               <span className={`font-bold font-mono ${results.tensileStressMPa > results.tensileStrengthMPa ? 'text-red-400' : 'text-wood-100'}`}>
                 {results.tensileStressMPa.toFixed(2)} / {results.tensileStrengthMPa.toFixed(1)} MPa
               </span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
               <span className="text-wood-400 font-mono text-[10px] uppercase">Joint Shear Stress</span>
               <span className="font-bold text-wood-100 font-mono">{results.jointStressMPa.toFixed(2)} MPa</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
               <span className="text-wood-400 font-mono text-[10px] uppercase">Leg Compression</span>
               <span className="font-bold text-wood-100 font-mono">{results.legStressMPa.toFixed(2)} MPa</span>
             </div>
             {inputs.type === 'chair' && (
               <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
                 <span className="text-wood-400 font-mono text-[10px] uppercase">Backrest Stress</span>
                 <span className="font-bold text-wood-100 font-mono">{results.backrestStressMPa?.toFixed(2)} MPa</span>
               </div>
             )}
             <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
               <span className="text-wood-400 font-mono text-[10px] uppercase">Joint Efficiency</span>
               <span className="font-bold text-emerald-400 font-mono">{(JOINT_STRENGTH_MULTIPLIER[inputs.jointType] * 100).toFixed(0)}%</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-wood-800 pb-2">
               <span className="text-wood-400 font-mono text-[10px] uppercase">Effective Span</span>
               <span className="font-bold text-wood-100 font-mono">{(inputs.length - 2 * inputs.topOverhang).toFixed(0)} cm</span>
             </div>
           </div>
           <div className="bg-wood-800/50 p-5 rounded-2xl border border-wood-700/50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2">
                <Activity className="w-4 h-4 text-wood-600 opacity-20" />
             </div>
             <h4 className="text-[10px] font-bold text-wood-300 uppercase mb-3 tracking-widest">Technical Assumptions & Insights</h4>
             <p className="text-xs text-wood-200 leading-relaxed font-light">
               {results.jointStressMPa > 5 ? 
                 "วิกฤต: ตรวจพบแรงเฉือนสูงที่จุดต่อ แนะนำให้เพิ่มความหนาของเดือยหรือเพิ่มคานรัดขา (Stretcher)" : 
                 `การกำหนดค่าปัจจุบันด้วยการเข้าไม้แบบ ${inputs.jointType === 'mortise_tenon' ? 'เดือยรู' : inputs.jointType === 'dowel' ? 'เดือยไม้กลม' : inputs.jointType === 'butterfly' ? 'เดือยผีเสื้อ' : inputs.jointType === 'screw' ? 'สกรู' : 'ชนชน'} ให้การกระจายน้ำหนักที่มั่นคง ${inputs.stretcherHeight > 0 ? 'คานรัดขาช่วยเพิ่มความเสถียรในแนวราบได้อย่างมาก' : 'ควรพิจารณาเพิ่มคานรัดขาเพื่อความทนทานในระยะยาว'}`}
             </p>
             <div className="mt-4 pt-4 border-t border-wood-700 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${results.isSafe ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                <span className="text-[10px] text-wood-400 font-mono uppercase">สถานะระบบ: {results.isSafe ? 'เหมาะสม (Optimal)' : 'มีความเสี่ยง (Compromised)'}</span>
             </div>
           </div>
         </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default FurnitureLoadSimulator;


