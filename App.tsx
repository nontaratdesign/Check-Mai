
import React, { useState } from 'react';
import { Calculator, MessagesSquare, Info as InfoIcon, TreePine, ScanLine, AlertOctagon, GitCompare } from 'lucide-react';
import WoodCalculator from './components/WoodCalculator';
import AIWoodExpert from './components/AIWoodExpert';
import StructureAnalyzer from './components/StructureAnalyzer';
import DamageAnalyzer from './components/DamageAnalyzer';
import CompareAnalyzer from './components/CompareAnalyzer';
import { AppTab } from './types';
import { SAMANEA_PROPERTIES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CALCULATOR);

  return (
    <div className="min-h-screen bg-[#fbf7f1] text-slate-800 pb-10 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="bg-wood-900 text-wood-50 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="w-8 h-8 text-wood-300" />
            <h1 className="text-xl font-bold tracking-tight">Check-<span className="text-wood-300">Mai</span></h1>
          </div>
          <div className="text-xs text-wood-300 hidden sm:block">
            Moonler Structure AI tester
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 mt-8 flex-1 w-full">
        
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-wood-600 to-wood-800 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">ทดสอบความแข็งแรงไม้จามจุรี (Structural Test)</h2>
            <p className="text-wood-100 max-w-2xl">
              โปรแกรมจำลองการรับน้ำหนักและ AI ที่ปรึกษาสำหรับงานเฟอร์นิเจอร์ไม้จามจุรี คำนวณการแอ่นตัวและวิเคราะห์โครงสร้างด้วยเทคโนโลยี AI
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab(AppTab.CALCULATOR)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.CALCULATOR
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Load Calculator (คำนวณ)
          </button>
          <button
            onClick={() => setActiveTab(AppTab.SMART_ANALYSIS)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.SMART_ANALYSIS
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            Analysis (วิเคราะห์แบบ)
          </button>
          <button
            onClick={() => setActiveTab(AppTab.COMPARE)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.COMPARE
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Compare (เปรียบเทียบ)
          </button>
          <button
            onClick={() => setActiveTab(AppTab.DAMAGE_CHECK)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.DAMAGE_CHECK
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            Damage Check (ตรวจสอบรอยร้าว)
          </button>
          <button
            onClick={() => setActiveTab(AppTab.AI_CONSULTANT)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.AI_CONSULTANT
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <MessagesSquare className="w-4 h-4" />
            AI Consultant (ปรึกษา AI)
          </button>
          <button
            onClick={() => setActiveTab(AppTab.INFO)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm whitespace-nowrap ${
              activeTab === AppTab.INFO
                ? 'bg-wood-600 text-white ring-4 ring-wood-600/20'
                : 'bg-white text-gray-600 hover:bg-wood-50'
            }`}
          >
            <InfoIcon className="w-4 h-4" />
            Info (ข้อมูลไม้)
          </button>
        </div>

        {/* Content Area */}
        <div className="transition-all duration-300">
          {activeTab === AppTab.CALCULATOR && <WoodCalculator />}
          {activeTab === AppTab.SMART_ANALYSIS && <StructureAnalyzer />}
          {activeTab === AppTab.COMPARE && <CompareAnalyzer />}
          {activeTab === AppTab.DAMAGE_CHECK && <DamageAnalyzer />}
          
          {activeTab === AppTab.AI_CONSULTANT && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AIWoodExpert />
              </div>
              <div className="space-y-6">
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200">
                   <h3 className="font-bold text-orange-800 mb-2">How to use AI (วิธีใช้)</h3>
                   <ul className="text-sm text-orange-900/80 space-y-2 list-disc list-inside">
                     <li>ถ่ายรูปหน้าตัดไม้เพื่อดูวงปี</li>
                     <li>ถ่ายรูปขาโต๊ะเพื่อดูการรับน้ำหนัก</li>
                     <li>ถามวิธีขัดเคลือบผิว</li>
                     <li>ตรวจสอบรอยร้าวว่าอันตรายไหม</li>
                   </ul>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-wood-100 shadow-sm">
                   <h3 className="font-bold text-gray-800 mb-2">Limitations (ข้อจำกัด)</h3>
                   <p className="text-sm text-gray-500">
                     AI วิเคราะห์จากภาพถ่าย อาจมีความคลาดเคลื่อน หากต้องการความแม่นยำสูงควรปรึกษาวิศวกรโครงสร้างหน้างานจริง
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === AppTab.INFO && (
            <div className="bg-white rounded-2xl shadow-sm border border-wood-200 p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <img 
                   src="https://picsum.photos/400/300?grayscale" 
                   alt="Wood Texture" 
                   className="w-full md:w-1/3 rounded-xl object-cover h-64"
                 />
                 <div className="flex-1">
                   <h2 className="text-2xl font-bold text-wood-900 mb-4">{SAMANEA_PROPERTIES.name}</h2>
                   <p className="text-gray-600 mb-6 leading-relaxed">
                     {SAMANEA_PROPERTIES.description}
                   </p>
                   
                   <h3 className="font-bold text-lg mb-4 text-wood-800">Technical Properties (ค่าเฉลี่ยทางเทคนิค)</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-wood-50 rounded-lg border border-wood-100">
                        <div className="text-xs text-wood-500 uppercase font-semibold">Density (ความหนาแน่น)</div>
                        <div className="text-xl font-bold text-wood-900">{SAMANEA_PROPERTIES.density} <span className="text-sm">kg/m³</span></div>
                      </div>
                      <div className="p-4 bg-wood-50 rounded-lg border border-wood-100">
                        <div className="text-xs text-wood-500 uppercase font-semibold">MOE (ค่าความยืดหยุ่น)</div>
                        <div className="text-xl font-bold text-wood-900">{SAMANEA_PROPERTIES.moe} <span className="text-sm">MPa</span></div>
                      </div>
                      <div className="p-4 bg-wood-50 rounded-lg border border-wood-100">
                        <div className="text-xs text-wood-500 uppercase font-semibold">MOR (ค่าแรงดัดสูงสุด)</div>
                        <div className="text-xl font-bold text-wood-900">{SAMANEA_PROPERTIES.mor} <span className="text-sm">MPa</span></div>
                      </div>
                   </div>

                   <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                     <strong>Note:</strong> ไม้จามจุรี (Rain Tree) เป็นไม้โตเร็ว เนื้อไม้มักมีความชื้นสูงและหดตัวได้มาก การนำไปใช้ทำเฟอร์นิเจอร์ควรผ่านการอบ (Kiln Dry) ที่ได้มาตรฐาน เพื่อป้องกันการบิดงอในภายหลัง
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 bg-wood-900 text-wood-300 text-center text-xs">
        <p className="mb-2 opacity-80">
          This app does not request camera and microphone permissions. (แอปพลิเคชันนี้ไม่ได้ร้องขอการเข้าถึงกล้องและไมโครโฟน)
        </p>
        <p className="font-medium text-wood-200">
          Trained and Created by Nontarat Hasitapong
        </p>
      </footer>
    </div>
  );
};

export default App;
