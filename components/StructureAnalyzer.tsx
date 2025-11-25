
import React, { useState } from 'react';
import { Upload, Camera, Loader2, AlertTriangle, CheckCircle, Target, ArrowRight, ShieldAlert, ScanLine, FileDown, FileText, FileType, Ruler, Eye, Users, MessageSquareQuote } from 'lucide-react';
import { analyzeFurnitureImage } from '../services/geminiService';
import { StructuralAnalysisResult } from '../types';
import { jsPDF } from "jspdf";

interface FileData {
  uri: string;
  name: string;
  type: string;
}

const StructureAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [userContext, setUserContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<StructuralAnalysisResult | null>(null);
  const [activeWeakPointIndex, setActiveWeakPointIndex] = useState<number | null>(null);
  
  // Expert Panel State: null = Summary, 0-4 = Specific Expert
  const [activeExpertIndex, setActiveExpertIndex] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          uri: reader.result as string,
          name: file.name,
          type: file.type
        });
        setResult(null); // Reset result on new file
        setActiveWeakPointIndex(null);
        setActiveExpertIndex(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeFurnitureImage(selectedFile.uri, userContext);
      setResult(analysis);
      setActiveExpertIndex(null); // Reset to summary view
    } catch (error) {
      alert("Analysis failed. Please try a different file.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Load Thai Font (Sarabun) from CDN
    try {
        const fontUrl = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf";
        const response = await fetch(fontUrl);
        const buffer = await response.arrayBuffer();
        const base64Font = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        doc.addFileToVFS("Sarabun-Regular.ttf", base64Font);
        doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
        doc.setFont("Sarabun");
    } catch (e) {
        console.warn("Failed to load Thai font for PDF. Text may not render correctly.", e);
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(186, 94, 44); // Wood color
    doc.text("Check-Mai Structural Report", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Type: ${result.furnitureType}`, margin, yPos);
    yPos += 15;

    // Image/File Section
    if (selectedFile?.type.startsWith('image/')) {
        try {
          const imgProps = doc.getImageProperties(selectedFile.uri);
          const imgHeight = (imgProps.height * 80) / imgProps.width; // Fix width to 80mm
          doc.addImage(selectedFile.uri, 'JPEG', margin, yPos, 80, imgHeight);
          
          renderStats(doc, margin + 90, yPos);
          yPos += Math.max(imgHeight + 15, 60);
        } catch (e) {
          console.error("Error adding image to PDF", e);
          renderStats(doc, margin, yPos); 
          yPos += 50;
        }
    } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, 80, 40, 'F');
        doc.setTextColor(100);
        doc.text(`Source: ${selectedFile?.name || 'PDF Document'}`, margin + 10, yPos + 20);
        
        renderStats(doc, margin + 90, yPos);
        yPos += 50;
    }

    // Dimensions Table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Dimensions & Specs (ตรวจสอบขนาด)", margin, yPos);
    yPos += 7;

    const dimData = [
        ["Overall", result.dimensions.overall || "-"],
        ["Leg Size", result.dimensions.legDimensions || "-"],
        ["Material", result.dimensions.materialThickness || "-"],
        ["Angles", result.dimensions.angles || "-"],
        ["Joinery", result.dimensions.joineryDetails || "-"]
    ];
    
    doc.setFontSize(10);
    doc.setDrawColor(200);
    
    dimData.forEach(([label, value]) => {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, 40, 8, 'F'); // Label bg
        doc.text(label || "", margin + 2, yPos + 5);
        doc.text(String(value), margin + 45, yPos + 5);
        yPos += 9;
    });
    yPos += 10;

    // Expert Panel Section in PDF
    doc.setFontSize(14);
    doc.text("Expert Panel Opinions (ความเห็นคณะผู้เชี่ยวชาญ)", margin, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(60);
    result.expertOpinions.forEach(exp => {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        const text = `[${exp.role}]: ${exp.analysis}`;
        const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
        doc.text(lines, margin, yPos);
        yPos += (lines.length * 5) + 3;
    });
    yPos += 5;

    // Main Analysis
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Final Consolidated Analysis (ผลวิเคราะห์สรุป)", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(result.analysisSummary, pageWidth - (margin * 2));
    doc.text(summaryLines, margin, yPos);
    yPos += (summaryLines.length * 5) + 10;

    // Disclaimer footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Disclaimer: AI-generated estimate. Physical testing required. (ผลวิเคราะห์จาก AI ควรทดสอบจริง)", margin, 280);

    doc.save(`samanea-report-${result.furnitureType.toLowerCase()}.pdf`);
  };

  const renderStats = (doc: jsPDF, x: number, y: number) => {
    if (!result) return;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Assessment (การประเมิน):", x, y + 10);
    
    doc.setFontSize(14);
    doc.text(`Score: ${result.structuralScore}/10`, x, y + 20);
    
    doc.text(`Max Load: ~${result.estimatedMaxLoadKg} kg`, x, y + 30);
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitAssessment = doc.splitTextToSize(result.joineryAssessment, 80);
    doc.text(splitAssessment, x, y + 40);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
      {/* Left Column: Input */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
          <h2 className="text-xl font-bold text-wood-900 mb-2 flex items-center">
            <ScanLine className="w-6 h-6 mr-2 text-wood-600" />
            3D & Blueprint Analysis (วิเคราะห์แบบ)
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Upload a <strong>screenshot of your 3D model</strong> or a <strong>PDF Blueprint</strong>. The AI will analyze dimensions, leg angles, joinery details, and load distribution.
          </p>

          {/* Upload Area */}
          <div className="mb-6">
            <div className={`relative border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center transition-colors overflow-hidden ${selectedFile ? 'border-wood-500 bg-wood-50' : 'border-gray-300 hover:border-wood-400 hover:bg-gray-50'}`}>
              
              {selectedFile ? (
                <div className="relative w-full flex flex-col items-center group">
                  {selectedFile.type.includes('pdf') ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <FileText className="w-16 h-16 text-red-500 mb-2" />
                        <span className="font-medium text-gray-700">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500 uppercase">PDF Document</span>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <img src={selectedFile.uri} alt="Design Preview" className="w-full h-auto max-h-[500px] object-contain rounded-lg" />
                      
                      {/* Bounding Box Overlays */}
                      {result?.weakPoints.map((wp, index) => {
                          const [ymin, xmin, ymax, xmax] = wp.box_2d;
                          // If coordinates are [0,0,0,0], don't render
                          if (ymin === 0 && xmin === 0 && ymax === 0 && xmax === 0) return null;

                          return (
                              <div
                                key={index}
                                className={`absolute border-2 transition-all cursor-pointer ${
                                    activeWeakPointIndex === index 
                                    ? 'border-red-600 bg-red-500/30 z-20 shadow-[0_0_15px_rgba(220,38,38,0.7)]' 
                                    : 'border-red-500/60 hover:border-red-500 hover:bg-red-500/10 z-10'
                                }`}
                                style={{
                                    top: `${ymin}%`,
                                    left: `${xmin}%`,
                                    height: `${ymax - ymin}%`,
                                    width: `${xmax - xmin}%`
                                }}
                                onMouseEnter={() => setActiveWeakPointIndex(index)}
                                onMouseLeave={() => setActiveWeakPointIndex(null)}
                              >
                                {activeWeakPointIndex === index && (
                                    <div className="absolute -top-8 left-0 bg-red-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30 shadow-md">
                                        Weak Point #{index + 1}
                                    </div>
                                )}
                              </div>
                          );
                      })}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => {setSelectedFile(null); setResult(null); setActiveWeakPointIndex(null);}}
                    className="absolute top-4 right-4 bg-white/90 text-red-600 px-3 py-1.5 rounded-full shadow-sm hover:bg-white z-30 text-sm font-medium"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center py-12">
                  <div className="bg-wood-100 p-4 rounded-full mb-3">
                    <FileType className="w-8 h-8 text-wood-600" />
                  </div>
                  <span className="text-wood-800 font-medium text-center">Click to Upload<br/>3D Image or PDF Blueprint</span>
                  <span className="text-xs text-gray-400 mt-2">Supports JPG, PNG, PDF</span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Context Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-wood-800 mb-2">
              Additional Details (รายละเอียดเพิ่มเติม)
            </label>
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Ex: Blueprint for a dining chair. Leg angle is 105 degrees. (ตัวอย่าง: เก้าอี้ทานข้าว ไม้หนา 3ซม. ต้องการรับน้ำหนัก 100กก.)"
              className="w-full px-4 py-3 border border-wood-200 rounded-xl focus:ring-2 focus:ring-wood-500 focus:outline-none h-24 text-sm"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            className="w-full bg-wood-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-wood-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-transform active:scale-[0.99]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                Analyze Structure (วิเคราะห์)
                <ArrowRight className="w-6 h-6 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="space-y-6">
        {result ? (
          <div className="animate-fade-in space-y-6">
            {/* Score Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-wood-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-2xl"></div>
               
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Analysis Result</h3>
                   <h2 className="text-2xl font-bold text-wood-900 capitalize">{result.furnitureType}</h2>
                 </div>
                 <div className={`px-4 py-1 rounded-full text-sm font-bold flex items-center ${
                   result.structuralScore >= 7 ? 'bg-green-100 text-green-700' : 
                   result.structuralScore >= 4 ? 'bg-yellow-100 text-yellow-700' : 
                   'bg-red-100 text-red-700'
                 }`}>
                   Score: {result.structuralScore}/10
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-wood-50 p-4 rounded-xl border border-wood-100 text-center">
                    <div className="text-xs text-wood-500 uppercase mb-1">Max Load (รับน้ำหนัก)</div>
                    <div className="text-3xl font-bold text-wood-800">~{result.estimatedMaxLoadKg} <span className="text-base font-normal">kg</span></div>
                  </div>
                  <div className="bg-wood-50 p-4 rounded-xl border border-wood-100 flex flex-col justify-center">
                    <div className="text-xs text-wood-500 uppercase mb-1">Joinery (การเข้าไม้)</div>
                    <div className="font-semibold text-gray-700 text-sm leading-tight line-clamp-2">{result.joineryAssessment}</div>
                  </div>
               </div>

                {/* Expert Panel Interactive View */}
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-indigo-900 flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            Expert Panel (คณะผู้เชี่ยวชาญ)
                        </h4>
                    </div>

                    {/* Expert Selector Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button 
                            onClick={() => setActiveExpertIndex(null)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[70px] transition-all ${
                                activeExpertIndex === null 
                                ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                                : 'bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                        >
                            <MessageSquareQuote className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Summary</span>
                        </button>

                        {result.expertOpinions.map((expert, idx) => {
                            // Assign varied colors for roles
                            const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700', 'bg-red-100 text-red-700'];
                            const activeColor = ['bg-blue-600', 'bg-green-600', 'bg-orange-600', 'bg-purple-600', 'bg-red-600'];
                            const colorClass = colors[idx % colors.length];
                            const activeClass = activeColor[idx % activeColor.length];

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveExpertIndex(idx)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[70px] transition-all border ${
                                        activeExpertIndex === idx
                                        ? `${activeClass} text-white shadow-md transform scale-105 border-transparent`
                                        : `bg-white hover:bg-gray-50 text-gray-600 border-gray-200`
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${activeExpertIndex === idx ? 'bg-white/20' : colorClass}`}>
                                        {expert.role.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-[9px] font-bold truncate max-w-[60px]">{expert.role.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Panel Content Display */}
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 min-h-[120px] shadow-sm">
                        {activeExpertIndex === null ? (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-2 text-indigo-800 font-bold border-b border-indigo-50 pb-2">
                                    <MessageSquareQuote className="w-4 h-4" />
                                    Panel Consensus (สรุปความเห็นรวม)
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {result.analysisSummary}
                                </p>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                {(() => {
                                    const expert = result.expertOpinions[activeExpertIndex];
                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-2 border-b border-gray-50 pb-2">
                                                <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                    {expert.role}
                                                </span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                    Confidence: {expert.confidence}/10
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{expert.analysis}</p>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dimensions Recheck Block */}
                <div className="bg-wood-50 p-5 rounded-xl border border-wood-100 mb-6">
                  <h4 className="font-bold text-wood-900 flex items-center mb-3">
                    <Ruler className="w-5 h-5 mr-2" />
                    Dimensions & Specs (ตรวจสอบขนาด)
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                     <div>
                       <span className="text-gray-500 block text-xs uppercase">Overall Size</span>
                       <span className="font-medium text-gray-800">{result.dimensions.overall || "-"}</span>
                     </div>
                     <div>
                       <span className="text-gray-500 block text-xs uppercase">Leg Size</span>
                       <span className="font-medium text-gray-800">{result.dimensions.legDimensions || "-"}</span>
                     </div>
                     <div>
                       <span className="text-gray-500 block text-xs uppercase">Thickness</span>
                       <span className="font-medium text-gray-800">{result.dimensions.materialThickness || "-"}</span>
                     </div>
                     <div>
                       <span className="text-gray-500 block text-xs uppercase">Key Angles</span>
                       <span className="font-medium text-gray-800">{result.dimensions.angles || "-"}</span>
                     </div>
                     <div className="col-span-2">
                       <span className="text-gray-500 block text-xs uppercase">Joinery Specs</span>
                       <span className="font-medium text-gray-800">{result.dimensions.joineryDetails || "-"}</span>
                     </div>
                  </div>
                </div>

               {/* PDF Button */}
               <button 
                 onClick={handleExportPDF}
                 className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-colors shadow-sm"
               >
                 <FileDown className="w-5 h-5" />
                 Download Report (PDF)
               </button>
            </div>

            {/* Analysis Details */}
            <div className="grid grid-cols-1 gap-4">
               {/* Weak Points */}
               <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                  <h4 className="font-bold text-red-800 flex items-center mb-3">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Potential Weak Points (จุดอ่อน)
                  </h4>
                  <ul className="space-y-3">
                    {result.weakPoints.map((point, idx) => (
                      <li 
                        key={idx} 
                        className={`flex items-start text-sm p-2 rounded-lg transition-colors cursor-pointer ${
                            activeWeakPointIndex === idx ? 'bg-red-100 text-red-900 ring-1 ring-red-300' : 'text-red-700 hover:bg-red-100/50'
                        }`}
                        onMouseEnter={() => setActiveWeakPointIndex(idx)}
                        onMouseLeave={() => setActiveWeakPointIndex(null)}
                      >
                        <div className="mr-3 flex-shrink-0 mt-0.5">
                            {activeWeakPointIndex === idx ? <Eye className="w-4 h-4" /> : <span className="w-4 h-4 block text-center font-bold">{idx + 1}</span>}
                        </div>
                        {point.issue}
                      </li>
                    ))}
                  </ul>
               </div>

               {/* Suggestions */}
               <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 flex items-center mb-3">
                    <Target className="w-5 h-5 mr-2" />
                    Suggestions (ข้อแนะนำ)
                  </h4>
                  <ul className="space-y-2">
                    {result.improvementSuggestions.map((point, idx) => (
                      <li key={idx} className="flex items-start text-sm text-blue-700">
                        <span className="mr-2">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">AI Safety Disclaimer</p>
                <p className="text-xs text-gray-500">
                  {result.safetyWarning || "This analysis is an AI estimation based on visual data only. Do not rely on this for critical safety loads. Physical testing is always required."}
                </p>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <ScanLine className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Waiting for Design</h3>
            <p className="text-sm text-gray-400 max-w-xs mt-2">
              Upload a 3D model screenshot OR a <strong>PDF Blueprint</strong>. The AI will inspect dimensions, legs, angles, and joints for production feasibility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StructureAnalyzer;
