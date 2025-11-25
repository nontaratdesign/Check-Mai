
import React, { useState } from 'react';
import { Upload, ArrowRight, Loader2, GitCompare, Trophy, CheckCircle, XCircle, Scale } from 'lucide-react';
import { compareFurnitureDesigns } from '../services/geminiService';
import { StructureComparisonResult } from '../types';

const CompareAnalyzer: React.FC = () => {
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<StructureComparisonResult | null>(null);

  const handleUpload = (side: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'A') setImageA(reader.result as string);
        else setImageB(reader.result as string);
        setResult(null); // Reset result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompare = async () => {
    if (!imageA || !imageB) return;
    setIsAnalyzing(true);
    try {
      const data = await compareFurnitureDesigns(imageA, imageB, context);
      setResult(data);
    } catch (e) {
      alert("Comparison failed. Try different images.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="font-sans space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
        <h2 className="text-xl font-bold text-wood-900 mb-2 flex items-center">
          <GitCompare className="w-6 h-6 mr-2 text-wood-600" />
          Compare Structure (เปรียบเทียบแบบ)
        </h2>
        <p className="text-sm text-gray-500">
          Upload two designs to see which one is better optimized for Rain Tree wood (Soft-Medium Hardwood) and Moonler production standards.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['A', 'B'].map((side) => (
          <div key={side} className="bg-white p-4 rounded-2xl shadow-sm border border-wood-200">
             <h3 className="font-bold text-wood-800 mb-4 flex items-center">
                <span className="w-6 h-6 rounded-full bg-wood-100 text-wood-700 flex items-center justify-center mr-2 text-sm">
                    {side}
                </span>
                Design {side}
             </h3>
             <div className={`relative border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-colors overflow-hidden ${
                 (side === 'A' ? imageA : imageB) ? 'border-wood-500 bg-wood-50' : 'border-gray-300 hover:bg-gray-50'
             }`}>
                {(side === 'A' ? imageA : imageB) ? (
                    <div className="relative w-full h-full">
                        <img 
                            src={(side === 'A' ? imageA : imageB)!} 
                            alt={`Design ${side}`} 
                            className="w-full h-full object-contain"
                        />
                         <button 
                            onClick={() => side === 'A' ? setImageA(null) : setImageB(null)}
                            className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow hover:bg-white"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-sm text-gray-500 font-medium">Upload Image/PDF</span>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleUpload(side as 'A'|'B', e)} className="hidden" />
                    </label>
                )}
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
        <label className="block text-sm font-medium text-wood-800 mb-2">Comparison Goal (เป้าหมายการเปรียบเทียบ)</label>
        <div className="flex gap-4">
            <input 
                type="text" 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: Which one is stronger? Which uses less wood? (อันไหนแข็งแรงกว่า? อันไหนผลิตง่ายกว่า?)"
                className="flex-1 px-4 py-3 border border-wood-200 rounded-xl focus:ring-2 focus:ring-wood-500 focus:outline-none"
            />
            <button
                onClick={handleCompare}
                disabled={!imageA || !imageB || isAnalyzing}
                className="bg-wood-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-wood-800 disabled:opacity-50 flex items-center shadow-lg"
            >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">Compare <Scale className="w-5 h-5 ml-2" /></span>}
            </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
            {/* Verdict Banner */}
            <div className={`p-6 rounded-2xl border-l-8 shadow-sm ${result.winner === 'A' ? 'bg-blue-50 border-blue-500' : result.winner === 'B' ? 'bg-green-50 border-green-500' : 'bg-gray-100 border-gray-500'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <Trophy className={`w-8 h-8 ${result.winner === 'A' ? 'text-blue-500' : result.winner === 'B' ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase opacity-60">Panel Verdict (คำตัดสิน)</h3>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {result.winner === 'Draw' ? "It's a Tie (เสมอ)" : `Design ${result.winner} is Better`}
                        </h2>
                    </div>
                    <div className="ml-auto flex gap-4 text-center">
                        <div>
                            <span className="block text-xs uppercase text-gray-500">Score A</span>
                            <span className="text-2xl font-bold text-blue-600">{result.scoreA}</span>
                        </div>
                        <div className="w-px bg-gray-300"></div>
                        <div>
                            <span className="block text-xs uppercase text-gray-500">Score B</span>
                            <span className="text-2xl font-bold text-green-600">{result.scoreB}</span>
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t border-black/5 pt-4">
                    {result.summaryVerdict}
                </p>
            </div>

            {/* Metrics Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-wood-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-wood-50 text-wood-800">
                        <tr>
                            <th className="p-4 text-left font-bold">Metric (หัวข้อเปรียบเทียบ)</th>
                            <th className="p-4 text-center font-bold text-blue-700 w-1/4">Design A</th>
                            <th className="p-4 text-center font-bold text-green-700 w-1/4">Design B</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-wood-100">
                        {result.metrics.map((m, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-700">{m.metricName}</td>
                                <td className={`p-4 text-center ${m.winner === 'A' ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-600'}`}>
                                    {m.valueA}
                                    {m.winner === 'A' && <CheckCircle className="w-4 h-4 inline ml-2" />}
                                </td>
                                <td className={`p-4 text-center ${m.winner === 'B' ? 'bg-green-50 font-bold text-green-700' : 'text-gray-600'}`}>
                                    {m.valueB}
                                    {m.winner === 'B' && <CheckCircle className="w-4 h-4 inline ml-2" />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pros/Cons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Design A Details */}
                <div className="bg-white p-5 rounded-xl border-t-4 border-t-blue-500 shadow-sm">
                    <h3 className="font-bold text-blue-700 mb-3">Design A Details</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-green-600 uppercase mb-2">Pros (จุดเด่น)</h4>
                            <ul className="space-y-1">
                                {result.prosA.map((p, i) => <li key={i} className="text-xs flex items-start text-gray-600"><CheckCircle className="w-3 h-3 mr-1.5 mt-0.5 text-green-500 shrink-0"/> {p}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-red-500 uppercase mb-2">Cons (จุดด้อย)</h4>
                            <ul className="space-y-1">
                                {result.consA.map((p, i) => <li key={i} className="text-xs flex items-start text-gray-600"><XCircle className="w-3 h-3 mr-1.5 mt-0.5 text-red-500 shrink-0"/> {p}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Design B Details */}
                <div className="bg-white p-5 rounded-xl border-t-4 border-t-green-500 shadow-sm">
                    <h3 className="font-bold text-green-700 mb-3">Design B Details</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-green-600 uppercase mb-2">Pros (จุดเด่น)</h4>
                            <ul className="space-y-1">
                                {result.prosB.map((p, i) => <li key={i} className="text-xs flex items-start text-gray-600"><CheckCircle className="w-3 h-3 mr-1.5 mt-0.5 text-green-500 shrink-0"/> {p}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-red-500 uppercase mb-2">Cons (จุดด้อย)</h4>
                            <ul className="space-y-1">
                                {result.consB.map((p, i) => <li key={i} className="text-xs flex items-start text-gray-600"><XCircle className="w-3 h-3 mr-1.5 mt-0.5 text-red-500 shrink-0"/> {p}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Production Advice */}
            <div className="bg-wood-800 text-wood-100 p-6 rounded-2xl shadow-lg">
                <h3 className="font-bold mb-2 flex items-center text-white">
                    <Scale className="w-5 h-5 mr-2" />
                    Moonler Production Recommendation
                </h3>
                <p className="text-sm opacity-90 leading-relaxed">
                    {result.productionRecommendation}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default CompareAnalyzer;
