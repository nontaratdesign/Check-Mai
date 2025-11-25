import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { SAMANEA_PROPERTIES } from '../constants';
import { CalculationInputs, CalculationResult } from '../types';

const WoodCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<CalculationInputs>({
    length: 120, // cm
    width: 60,   // cm
    thickness: 3, // cm
    load: 80,    // kg
    loadType: 'center'
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  // Real-time calculation
  useEffect(() => {
    // 1. Convert to SI units (meters, Newtons, Pascals)
    const L = inputs.length / 100; // m
    const w = inputs.width / 100;  // m
    const t = inputs.thickness / 100; // m
    const F = inputs.load * 9.81; // N (Load in Newtons)
    const E = SAMANEA_PROPERTIES.moe * 1e6; // Pa (Convert MPa to Pa)
    const MOR = SAMANEA_PROPERTIES.mor * 1e6; // Pa

    // 2. Moment of Inertia (I) for a rectangular cross-section: I = (w * t^3) / 12
    const I = (w * Math.pow(t, 3)) / 12;

    // 3. Max Bending Moment (M)
    // Simply supported beam assumption
    let M = 0;
    let maxDeflectionMeters = 0;

    if (inputs.loadType === 'center') {
      M = (F * L) / 4;
      maxDeflectionMeters = (F * Math.pow(L, 3)) / (48 * E * I);
    } else {
      // Distributed load (approximate as uniform)
      M = (F * L) / 8;
      maxDeflectionMeters = (5 * F * Math.pow(L, 3)) / (384 * E * I);
    }

    // 4. Bending Stress (Sigma) = (M * y) / I, where y = t/2
    const y = t / 2;
    const stress = (M * y) / I; // Pa

    // 5. Results
    const stressMPa = stress / 1e6;
    const safetyFactor = MOR / stress;
    const deflectionMM = maxDeflectionMeters * 1000;

    // Calculate Max Recommended Load (Reverse calculate for Safety Factor = 2.0)
    // Target Stress = MOR / 2.0
    // Target M = (Target Stress * I) / y
    // Target F = (Target M * 4) / L (for center load)
    const targetStress = MOR / 2.0;
    const targetM = (targetStress * I) / y;
    const targetF = inputs.loadType === 'center' ? (targetM * 4) / L : (targetM * 8) / L;
    const maxLoadKg = targetF / 9.81;

    // Weight of the board itself
    const volume = L * w * t;
    const weightKg = volume * SAMANEA_PROPERTIES.density;

    setResult({
      deflection: deflectionMM,
      bendingStress: stressMPa,
      safetyFactor: safetyFactor,
      isSafe: safetyFactor > 1.5, // 1.5 is a bare minimum for furniture
      maxLoadRecommended: maxLoadKg,
      weightOfBoard: weightKg
    });
  }, [inputs]);

  // Generate chart data based on current geometry
  const chartData = useMemo(() => {
    if (!result) return [];
    const data = [];
    // Generate 10 points up to 1.5x the max recommended load
    const maxPlotLoad = result.maxLoadRecommended * 1.5;
    const step = maxPlotLoad / 10;
    
    // Constant geometry terms
    const L = inputs.length / 100;
    const w = inputs.width / 100;
    const t = inputs.thickness / 100;
    const I = (w * Math.pow(t, 3)) / 12;
    const E = SAMANEA_PROPERTIES.moe * 1e6;

    for (let load = 0; load <= maxPlotLoad; load += step) {
      const F = load * 9.81;
      let defM = 0;
      if (inputs.loadType === 'center') {
        defM = (F * Math.pow(L, 3)) / (48 * E * I);
      } else {
        defM = (5 * F * Math.pow(L, 3)) / (384 * E * I);
      }
      data.push({
        load: Math.round(load),
        deflection: (defM * 1000).toFixed(2),
        safeLimit: result.maxLoadRecommended
      });
    }
    return data;
  }, [inputs, result]);

  const handleInputChange = (field: keyof CalculationInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
        <h2 className="text-xl font-bold text-wood-900 mb-6 flex items-center">
          <RotateCcw className="w-5 h-5 mr-2" />
          Parameters (ขนาดและน้ำหนัก)
        </h2>
        
        <div className="space-y-6">
          {/* Dimensions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dimensions (ขนาดไม้)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-wood-800 mb-1">Length (ยาว - cm)</label>
                <input 
                  type="number" 
                  value={inputs.length}
                  onChange={(e) => handleInputChange('length', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:ring-2 focus:ring-wood-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-800 mb-1">Width (กว้าง - cm)</label>
                <input 
                  type="number" 
                  value={inputs.width}
                  onChange={(e) => handleInputChange('width', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:ring-2 focus:ring-wood-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-wood-800 mb-1">Thickness (หนา - cm)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" max="10" step="0.5"
                    value={inputs.thickness}
                    onChange={(e) => handleInputChange('thickness', Number(e.target.value))}
                    className="flex-1 accent-wood-600 h-2 bg-wood-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    value={inputs.thickness}
                    onChange={(e) => handleInputChange('thickness', Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-wood-300 rounded-lg focus:ring-2 focus:ring-wood-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Load */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Load (น้ำหนักบรรทุก)</h3>
            <div>
              <label className="block text-sm font-medium text-wood-800 mb-1">Total Weight (kg)</label>
              <input 
                type="number" 
                value={inputs.load}
                onChange={(e) => handleInputChange('load', Number(e.target.value))}
                className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:ring-2 focus:ring-wood-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wood-800 mb-2">Load Type</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleInputChange('loadType', 'center')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border ${inputs.loadType === 'center' ? 'bg-wood-100 border-wood-500 text-wood-800' : 'border-gray-200 text-gray-600'}`}
                >
                  Center Point
                </button>
                <button 
                  onClick={() => handleInputChange('loadType', 'distributed')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border ${inputs.loadType === 'distributed' ? 'bg-wood-100 border-wood-500 text-wood-800' : 'border-gray-200 text-gray-600'}`}
                >
                  Distributed
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results & Visuals */}
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className={`p-6 rounded-2xl border-l-8 shadow-sm ${result?.isSafe ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Structural Status</h3>
              <p className={`text-sm font-medium ${result?.isSafe ? 'text-green-700' : 'text-red-700'}`}>
                {result?.isSafe ? 'PASSED (ปลอดภัย)' : 'FAILED (อันตราย - หักหรือแอ่นมากเกินไป)'}
              </p>
            </div>
            {result?.isSafe ? <CheckCircle className="text-green-500 w-8 h-8" /> : <AlertTriangle className="text-red-500 w-8 h-8" />}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Deflection (ระยะแอ่น)</p>
                <p className="text-xl font-bold text-gray-800">{result?.deflection.toFixed(2)} <span className="text-sm font-normal">mm</span></p>
             </div>
             <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Safety Factor</p>
                <p className="text-xl font-bold text-gray-800">{result?.safetyFactor.toFixed(2)}</p>
             </div>
             <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Rec. Max Load</p>
                <p className="text-xl font-bold text-gray-800">{Math.round(result?.maxLoadRecommended || 0)} <span className="text-sm font-normal">kg</span></p>
             </div>
             <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Board Weight</p>
                <p className="text-xl font-bold text-gray-800">{result?.weightOfBoard.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
             </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
           <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Load vs. Deflection Simulation</h3>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c67636" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#c67636" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="load" label={{ value: 'Load (kg)', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis label={{ value: 'Deflection (mm)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: any) => [`${value} mm`, 'Deflection']}
                  />
                  <ReferenceLine x={inputs.load} stroke="red" strokeDasharray="3 3" label="Current" />
                  <Area type="monotone" dataKey="deflection" stroke="#ba5e2c" fillOpacity={1} fill="url(#colorDef)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
           <p className="text-xs text-gray-400 mt-2 text-center">
             *Simulation based on average Samanea properties (MOR: 65MPa, MOE: 9.5GPa). Actual wood varies.
           </p>
        </div>
      </div>
    </div>
  );
};

export default WoodCalculator;