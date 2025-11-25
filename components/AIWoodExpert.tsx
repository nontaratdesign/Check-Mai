import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, X, Loader2, Camera, AlertCircle } from 'lucide-react';
import { analyzeWoodStructure } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIWoodExpert: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'สวัสดีครับ! ผมคือผู้เชี่ยวชาญด้านโครงสร้างไม้จามจุรี (AI Consultant). ถ่ายรูปเฟอร์นิเจอร์ หรือถามคำถามเกี่ยวกับการรับน้ำหนัก การดูแลรักษา หรือเกรดไม้ได้เลยครับ'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const prompt = newMessage.text || (newMessage.image ? "ช่วยวิเคราะห์รูปภาพไม้/โครงสร้างนี้ให้หน่อยครับ ว่าเป็นไม้จามจุรีไหม และมีความแข็งแรงหรือจุดบกพร่องตรงไหนบ้าง" : "");
      
      const responseText = await analyzeWoodStructure(prompt, newMessage.image);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ AI หรือ API Key ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border border-wood-200 overflow-hidden">
      {/* Header */}
      <div className="bg-wood-800 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wood-600 flex items-center justify-center border-2 border-wood-400">
            <span className="text-xl">🪵</span>
          </div>
          <div>
            <h3 className="font-bold">Check-Mai AI Expert</h3>
            <p className="text-xs text-wood-200">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-wood-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-wood-600 text-white rounded-tr-none' 
                : msg.isError 
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                  : 'bg-white text-gray-800 border border-wood-100 shadow-sm rounded-tl-none'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Upload" className="max-h-48 rounded-lg mb-3 object-cover border border-white/20" />
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-wood-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-wood-600" />
              <span className="text-xs text-gray-500">AI is analyzing structure...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-wood-100">
        {selectedImage && (
          <div className="relative inline-block mb-3">
            <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-wood-200" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
           <label className="cursor-pointer p-3 text-wood-500 hover:bg-wood-50 rounded-xl transition-colors flex items-center justify-center border border-transparent hover:border-wood-200">
             <Camera className="w-5 h-5" />
             <input 
               type="file" 
               accept="image/*" 
               onChange={handleImageUpload} 
               className="hidden"
             />
           </label>
           <input
             type="text"
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
             placeholder="ถามเกี่ยวกับไม้จามจุรี หรือส่งรูปเพื่อวิเคราะห์..."
             className="flex-1 px-4 py-3 bg-wood-50 border border-wood-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wood-400 focus:bg-white transition-all text-sm"
           />
           <button
             onClick={handleSendMessage}
             disabled={isLoading || (!inputText.trim() && !selectedImage)}
             className="bg-wood-600 text-white p-3 rounded-xl hover:bg-wood-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center"
           >
             <Send className="w-5 h-5" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default AIWoodExpert;