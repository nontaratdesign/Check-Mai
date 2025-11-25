
import React, { useState } from 'react';
import { Upload, AlertOctagon, Loader2, Wrench, Hammer, CheckCircle, AlertTriangle, ArrowRight, Stethoscope, FileText, Ban, MessagesSquare, Send, MessageCircle, Users, MessageSquareQuote } from 'lucide-react';
import { analyzeFurnitureDamage, analyzeWoodStructure } from '../services/geminiService';
import { DamageAnalysisResult, ChatMessage } from '../types';

const DamageAnalyzer: React.FC = () => {
  const [damageImage, setDamageImage] = useState<string | null>(null);
  const [blueprintImage, setBlueprintImage] = useState<string | null>(null);
  const [userContext, setUserContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DamageAnalysisResult | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Expert Panel State: null = Summary, 0-4 = Specific Expert
  const [activeExpertIndex, setActiveExpertIndex] = useState<number | null>(null);

  const handleDamageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDamageImage(reader.result as string);
        setResult(null);
        setChatMessages([]); // Reset chat on new image
        setActiveExpertIndex(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBlueprintImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!damageImage) return;

    setIsAnalyzing(true);
    setChatMessages([]);
    try {
      const analysis = await analyzeFurnitureDamage(damageImage, blueprintImage, userContext);
      setResult(analysis);
      setActiveExpertIndex(null); // Reset to summary
    } catch (error) {
      alert("Analysis failed. Please try a different image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: chatInput,
        image: damageImage || undefined
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
        // Construct a context-aware prompt using previous analysis
        let contextPrompt = "";
        if (result) {
            contextPrompt = `
                [CONTEXT from previous analysis]
                Damage Type: ${result.damageType}
                Cause: ${result.causeAnalysis}
                Severity: ${result.severityLevel}
                Recommendation: ${result.recommendation}
                -----------------------------------
                User Question: ${userMsg.text}
                
                Answer as a QC and Repair Expert. Focus on manufacturing defects (glue, dowels) or packaging issues if relevant.
            `;
        } else {
            contextPrompt = userMsg.text;
        }

        const responseText = await analyzeWoodStructure(contextPrompt, damageImage || undefined);
        
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: responseText
        }]);
    } catch (e) {
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Sorry, I encountered an error answering your question. (ขออภัย เกิดข้อผิดพลาด)"
        }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
      {/* Input Section */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
          <h2 className="text-xl font-bold text-red-900 mb-2 flex items-center">
            <Stethoscope className="w-6 h-6 mr-2" />
            Damage Analysis (วิเคราะห์รอยแตก/ความเสียหาย)
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Upload a photo of the <strong>crack, break, or defect</strong>. Optionally upload the <strong>Blueprint/Design</strong> for more accuracy.
          </p>

          <div className="grid grid-cols-1 gap-4 mb-6">
              {/* Main Damage Image */}
              <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors overflow-hidden ${damageImage ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-200 hover:bg-red-50/50'}`}>
                {damageImage ? (
                  <div className="relative w-full flex flex-col items-center">
                    <span className="absolute top-0 left-0 bg-red-600 text-white text-xs px-2 py-1 rounded-br-lg z-10">Damage Photo</span>
                    <img src={damageImage} alt="Damage Preview" className="w-full h-48 object-contain rounded-lg" />
                    <button 
                      onClick={() => {setDamageImage(null); setResult(null); setChatMessages([]); setActiveExpertIndex(null);}}
                      className="absolute top-2 right-2 bg-white/90 text-red-600 p-1.5 rounded-full shadow-sm hover:bg-white z-10"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center py-4">
                    <div className="bg-red-100 p-3 rounded-full mb-2">
                      <AlertOctagon className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="text-gray-800 font-medium text-center text-sm">1. Upload Damage Photo <span className="text-red-500">*</span></span>
                    <input type="file" accept="image/*" onChange={handleDamageUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* Optional Blueprint Image */}
              <div className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors overflow-hidden ${blueprintImage ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                {blueprintImage ? (
                  <div className="relative w-full flex flex-col items-center">
                    <span className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-br-lg z-10">Blueprint</span>
                    <img src={blueprintImage} alt="Blueprint Preview" className="w-full h-32 object-contain rounded-lg" />
                    <button 
                      onClick={() => setBlueprintImage(null)}
                      className="absolute top-2 right-2 bg-white/90 text-blue-600 p-1.5 rounded-full shadow-sm hover:bg-white z-10"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center py-4">
                    <div className="bg-blue-100 p-3 rounded-full mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-gray-800 font-medium text-center text-sm">2. Upload Reference/Blueprint <span className="text-gray-400 text-xs">(Optional)</span></span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleBlueprintUpload} className="hidden" />
                  </label>
                )}
              </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Describe the problem (รายละเอียดปัญหา)
            </label>
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Ex: Chair leg cracked when sitting. (ตัวอย่าง: ขาเก้าอี้มีเสียงดังเปรี๊ยะแล้วร้าว)"
              className="w-full px-4 py-3 border border-wood-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none h-24 text-sm"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!damageImage || isAnalyzing}
            className="w-full bg-red-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-transform active:scale-[0.99]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Simulating Expert Panel...
              </>
            ) : (
              <>
                Diagnose Damage (วิเคราะห์ความเสียหาย)
                <ArrowRight className="w-6 h-6 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Section */}
      <div className="space-y-6">
        {result ? (
          <div className="animate-fade-in space-y-6">
            
            {/* Recommendation Tag - Critical if not repairable */}
            {!result.isRepairable && (
                <div className="bg-red-600 text-white p-4 rounded-xl shadow-md flex items-center justify-center gap-3 animate-pulse">
                    <Ban className="w-8 h-8" />
                    <div className="text-center">
                        <h3 className="font-bold text-lg uppercase">Do Not Repair (ไม่ควรซ่อม)</h3>
                        <p className="text-xs opacity-90">Structural integrity compromised. Dangerous to use.</p>
                    </div>
                </div>
            )}

            {/* Severity Card */}
            <div className={`p-6 rounded-2xl border-l-8 shadow-sm ${getSeverityColor(result.severityLevel)}`}>
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <h3 className="text-sm font-bold uppercase opacity-80">Severity Level (ความรุนแรง)</h3>
                   <h2 className="text-3xl font-bold">{result.severityLevel}</h2>
                   <p className="text-sm font-medium mt-1">{result.damageType}</p>
                 </div>
                 <AlertTriangle className="w-10 h-10 opacity-50" />
               </div>
               <div className="bg-white/50 p-3 rounded-lg mt-4">
                  <span className="font-bold text-sm block mb-1">Recommendation:</span>
                  <span className="text-sm font-semibold">{result.recommendation}</span>
               </div>
               <div className="bg-white/50 p-3 rounded-lg mt-2">
                  <span className="font-bold text-sm block mb-1">Safety Assessment:</span>
                  <span className="text-sm">{result.safetyAssessment}</span>
               </div>
            </div>

            {/* Expert Panel Interactive */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Diagnostic Panel (ความเห็นคณะวินิจฉัย)
                    </h4>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setActiveExpertIndex(null)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[70px] transition-all ${
                            activeExpertIndex === null 
                            ? 'bg-slate-700 text-white shadow-md transform scale-105' 
                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                    >
                        <MessageSquareQuote className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">Summary</span>
                    </button>

                    {result.expertOpinions.map((expert, idx) => {
                         // Color coding for roles
                         const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700'];
                         const activeColor = ['bg-red-600', 'bg-blue-600', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600'];
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

                {/* Content */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 min-h-[120px] shadow-sm">
                    {activeExpertIndex === null ? (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                                <MessageSquareQuote className="w-4 h-4" />
                                Panel Consensus (สรุปความเห็นรวม)
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {result.causeAnalysis}
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
                                                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                                {expert.role}
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

            {/* Repair Guide (Only show if repairable) */}
            {result.isRepairable ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-wood-200">
                <h3 className="font-bold text-wood-800 flex items-center mb-4">
                    <Wrench className="w-5 h-5 mr-2" />
                    Repair Guide (วิธีการซ่อมแซม)
                </h3>
                
                <div className="space-y-4">
                    {result.repairGuide.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-wood-100 text-wood-700 flex items-center justify-center font-bold text-xs mt-0.5">
                        {idx + 1}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                    </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center mb-2">
                    <Hammer className="w-4 h-4 mr-2" />
                    Tools Needed (เครื่องมือที่ต้องใช้)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                    {result.toolsNeeded.map((tool, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                        {tool}
                        </span>
                    ))}
                    </div>
                </div>
                </div>
            ) : (
                <div className="bg-gray-100 p-6 rounded-2xl text-center border border-gray-200">
                    <h3 className="font-bold text-gray-500 mb-2">No Repair Guide Available</h3>
                    <p className="text-sm text-gray-400">Since this damage is critical/irreparable, we do not recommend attempting a DIY repair for safety reasons.</p>
                </div>
            )}
            
            {/* AI CHAT SECTION */}
            <div className="bg-wood-50 p-6 rounded-2xl shadow-inner border border-wood-100">
                <h3 className="font-bold text-wood-900 mb-4 flex items-center">
                    <MessagesSquare className="w-5 h-5 mr-2" />
                    Consult AI about this Damage (ถามตอบ AI เกี่ยวกับปัญหานี้)
                </h3>
                
                <div className="bg-white rounded-xl border border-wood-100 h-64 overflow-y-auto p-4 mb-4 space-y-3">
                    {chatMessages.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-10">
                            Ask specific questions like "Can I use epoxy?" or "Is this a glue failure?"<br/>
                            (ถามคำถามเพิ่มเติมได้ที่นี่)
                        </div>
                    )}
                    {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                                msg.role === 'user' 
                                    ? 'bg-wood-600 text-white rounded-tr-none' 
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-wood-600" />
                                <span className="text-xs text-gray-500">AI is typing...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        placeholder="Type your question here... (พิมพ์คำถามที่นี่)"
                        className="flex-1 px-4 py-2 bg-white border border-wood-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wood-400 text-sm"
                    />
                    <button
                        onClick={handleSendChatMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="bg-wood-600 text-white p-2 rounded-lg hover:bg-wood-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <AlertOctagon className="w-8 h-8 text-red-200" />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Waiting for Photo</h3>
            <p className="text-sm text-gray-400 max-w-xs mt-2">
              Upload a photo of the damage. <br/>
              <span className="text-xs">Optional: Upload the blueprint for better analysis.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DamageAnalyzer;
