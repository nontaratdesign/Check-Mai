import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { StructuralAnalysisResult, DamageAnalysisResult, StructureComparisonResult } from "../types";

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.GEMINI_API_KEY is available.");
  }
  return new GoogleGenAI({ apiKey });
};

// *** CRITICAL: SINGLE SOURCE OF TRUTH FOR ALL ANALYSES ***
// This context contains the exact scientific data provided by the user.
// AI must NOT hallucinate or use external training data that conflicts with this.
const WOOD_SPECS_CONTEXT = `
*** OFFICIAL TECHNICAL DATA FOR SAMANEA SAMAN (RAIN TREE) ***
**Classification**: Soft to Medium Hardwood (ไม้เนื้ออ่อนถึงแข็งปานกลาง).
**Physical Properties**:
- Basic Density at 12% MC: 550—700 kg/m³.
- Air-dry Density (12% MC): 0.53 g/cm³.
- Specific Gravity: 0.46 g/cm³.
- Seed Weight: 1000 seeds = 125—225 g.
- Natural Durability Index: 6 (1=Very High, 7=Very Low). Note: Low durability against insects if untreated.

**Shrinkage & Stability**:
- Total Shrinkage Tangential (Saturated to 0% MC): 1.8% (Extremely Low).
- Total Shrinkage Radial (Saturated to 0% MC): 1.0%.
- Dimensional Stability Ratio: 1.8.
- Workability: Green wood can be carved without risk of warping or splitting.

**Drying & Defects**:
- Ease of Drying: Dries rapidly. Backsawn stock develops surface checks (shallow).
- Kiln Schedules: Approx 6 days (Green to 12% MC). Requires high humidity treatment (24hr) after drying.
- Warning: Final steaming is NOT recommended as checks reopen.

*** MOONLER MANUFACTURING STANDARDS (มาตรฐานการผลิตมูนเลอร์) ***
1. **Kiln Drying (การอบไม้)**: Moonler kiln-dries ALL wood to **15-20% Moisture Content** before assembly to ensure stability in the tropical/export environment.
2. **Joinery (การเข้าไม้)**: Main construction uses **Wooden Dowels** (เดือยไม้) as the primary connector.
3. **Hardware Policy (การใช้น็อต/สกรู)**: Moonler **ALLOWS screws** (อนุญาตให้ใช้สกรู) in specific points where strictly necessary or where they significantly **enhance structural strength** (เพิ่มความแข็งแรง). While dowels are the base, screws are not prohibited if they improve durability or are required for assembly.
****************************************************
`;

export const analyzeWoodStructure = async (
  promptText: string,
  imageBase64?: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const modelId = "gemini-3-flash-preview"; 

    let contents: { parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] };

    const fullSystemInstruction = `You are an expert structural engineer and master carpenter for Moonler Furniture.
    
    STRICTLY ADHERE TO THIS TECHNICAL DATA FOR EVERY ANSWER:
    ${WOOD_SPECS_CONTEXT}
    
    Rules:
    1. Always classify Samanea Saman as "Soft to Medium Hardwood".
    2. Reference the specific density (0.53 g/cm³) and shrinkage (1.8%) when explaining wood behavior.
    3. Regarding screws: Confirm that Moonler allows them where necessary to increase strength.
    4. Reply in Thai (Human-like, professional tone).`;

    if (imageBase64) {
      const mimeTypeMatch = imageBase64.match(/^data:(.*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      contents = {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: promptText }
        ]
      };
    } else {
      contents = { parts: [{ text: promptText }] };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: fullSystemInstruction,
        // thinkingConfig removed to support standard API keys
      }
    });

    return response.text || "Unable to analyze at this time. (ไม่สามารถวิเคราะห์ได้ในขณะนี้)";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeFurnitureImage = async (
  fileDataUrl: string,
  userContext: string
): Promise<StructuralAnalysisResult> => {
  try {
    const ai = getAiClient();
    
    const mimeTypeMatch = fileDataUrl.match(/^data:(.*);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = fileDataUrl.split(',')[1] || fileDataUrl;
    const isPdf = mimeType.includes('pdf');

    const corePrompt = `
         Context from user: "${userContext}".
         
         ${WOOD_SPECS_CONTEXT}

         **SIMULATE A PANEL OF 5 EXPERTS** to debate this design based on the wood data above:
         1. **Structural Engineer**: Calculate load paths. Is the design stiff enough for a Soft-Medium Hardwood (Density 0.53 g/cm³)? For chairs, consider backrest leverage and leg angles.
         2. **Material Scientist**: Review thickness. Since Density is only ~0.53g/cm³, components usually need to be thicker than Teak. Mention the benefit of Low Shrinkage (1.8%). Check if MC% (15-20%) aligns with Moonler standard.
         3. **Master Carpenter**: Analyze joinery. Primary uses **Wooden Dowels**, but check if **Screws** are used in critical areas to enhance strength (which is allowed). Are the connections logical? Check backrest-to-seat and leg-to-apron joints for angled stress.
         4. **Production QC**: Look for "Surface Checks" or potential drying defects mentioned in the specs.
         5. **Safety Inspector**: Assess stability.

         Output Format:
         - Provide the debate (Expert Opinions).
         - Consolidate into a final score and summary.
         - All text MUST be BILINGUAL (English & Thai).
    `;

    const promptText = isPdf 
      ? `Analyze this Blueprint/PDF (Samanea Saman). ${corePrompt}`
      : `Analyze this Image (Samanea Saman). ${corePrompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            furnitureType: { type: Type.STRING },
            estimatedMaxLoadKg: { type: Type.NUMBER },
            structuralScore: { type: Type.NUMBER },
            expertOpinions: {
              type: Type.ARRAY,
              description: "Debate details from the 5 experts",
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            },
            analysisSummary: { type: Type.STRING },
            joineryAssessment: { type: Type.STRING },
            weakPoints: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                }
              }
            },
            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyWarning: { type: Type.STRING },
            dimensions: {
              type: Type.OBJECT,
              properties: {
                overall: { type: Type.STRING },
                legDimensions: { type: Type.STRING },
                materialThickness: { type: Type.STRING },
                angles: { type: Type.STRING },
                joineryDetails: { type: Type.STRING }
              },
              required: ["overall", "legDimensions", "materialThickness", "angles", "joineryDetails"]
            }
          },
          required: ["furnitureType", "estimatedMaxLoadKg", "structuralScore", "expertOpinions", "analysisSummary", "joineryAssessment", "weakPoints", "dimensions"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as StructuralAnalysisResult;
  } catch (error) {
    console.error("Gemini Structural Analysis Error:", error);
    throw error;
  }
};

export const analyzeFurnitureDamage = async (
  damageFileDataUrl: string,
  blueprintFileDataUrl: string | null,
  userContext: string
): Promise<DamageAnalysisResult> => {
  try {
    const ai = getAiClient();
    
    const getParts = (url: string) => {
        const mimeMatch = url.match(/^data:(.*);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const data = url.split(',')[1] || url;
        return { mimeType, data };
    };

    const damageImg = getParts(damageFileDataUrl);
    const parts: { inlineData: { mimeType: string; data: string } }[] = [{ inlineData: { mimeType: damageImg.mimeType, data: damageImg.data } }];

    if (blueprintFileDataUrl) {
        const blueprintImg = getParts(blueprintFileDataUrl);
        parts.push({ inlineData: { mimeType: blueprintImg.mimeType, data: blueprintImg.data } });
    }

    const promptText = `Analyze this DAMAGED furniture (Samanea Saman - Moonler Product).
         Context: "${userContext}".
         
         ${WOOD_SPECS_CONTEXT}
         
         **SIMULATE A PANEL OF 5 EXPERTS** to investigate:
         1. **Forensic Engineer**: Analyze stress vs density (0.53g/cm³). Did it fail due to overload or design?
         2. **Material Scientist**: Check for **Drying Defects** or **Surface Checks** (common in Backsawn stock). Is the MC% likely correct (15-20%)? Did shrinkage (Tangential 1.8%) cause the split?
         3. **Master Carpenter**: Did the joinery fail? Check **Wooden Dowels** and glue application. If **Screws** are present, were they used correctly to enhance strength or did they cause a split?
         4. **Production QC**: Look for manufacturing defects (dowels too small, glue starvation, short grain).
         5. **Logistics Expert**: Look for impact marks/packaging issues.

         Output strictly in JSON. All text BILINGUAL (English & Thai).`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            damageType: { type: Type.STRING },
            severityLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
            isRepairable: { type: Type.BOOLEAN },
            recommendation: { type: Type.STRING },
            expertOpinions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            },
            causeAnalysis: { type: Type.STRING },
            repairabilityScore: { type: Type.NUMBER },
            repairGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyAssessment: { type: Type.STRING },
            toolsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["damageType", "severityLevel", "isRepairable", "recommendation", "expertOpinions", "causeAnalysis", "repairabilityScore", "repairGuide", "safetyAssessment", "toolsNeeded"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as DamageAnalysisResult;
  } catch (error) {
    console.error("Gemini Damage Analysis Error:", error);
    throw error;
  }
};

export const extractSimulationData = async (
  fileDataUrl: string
): Promise<SimulationExtractionResult> => {
  try {
    const ai = getAiClient();
    const mimeTypeMatch = fileDataUrl.match(/^data:(.*);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = fileDataUrl.split(',')[1] || fileDataUrl;

    const promptText = `
      Extract numerical structural data from this furniture blueprint or image for a load simulation.
      Wood: Samanea Saman (Rain Tree).
      
      Return ONLY JSON with these fields:
      - furnitureType: 'table', 'bench', 'shelf', 'cantilever', or 'chair'
      - lengthCm: overall length in cm
      - widthCm: overall width in cm
      - thicknessCm: material thickness in cm
      - legCount: number of legs
      - legWidthCm: width of the legs in cm
      - legThicknessCm: thickness of the legs in cm
      - apronHeightCm: height of the supporting apron/rail under the top in cm
      - stretcherHeightCm: height of the stretcher connecting legs in cm (0 if none)
      - stretcherWidthCm: width of the stretcher in cm
      - stretcherThicknessCm: thickness of the stretcher in cm
      - topOverhangCm: distance from leg to edge of top in cm
      - jointType: 'dowel', 'mortise_tenon', 'screw', 'butterfly', or 'butt'
      - backrestHeightCm: (for chairs) height of backrest in cm
      - backrestAngleDeg: (for chairs) angle of backrest in degrees
      - seatDepthCm: (for chairs) depth of the seat in cm
      - shelfTiers: (for shelves) number of shelf levels
      - legAngleDeg: angle of legs in degrees (0 is vertical)
      - confidence: 1-10
      - reasoning: brief explanation of why these values were chosen
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            furnitureType: { type: Type.STRING, enum: ['table', 'bench', 'shelf', 'cantilever', 'chair'] },
            lengthCm: { type: Type.NUMBER },
            widthCm: { type: Type.NUMBER },
            thicknessCm: { type: Type.NUMBER },
            legCount: { type: Type.NUMBER },
            legWidthCm: { type: Type.NUMBER },
            legThicknessCm: { type: Type.NUMBER },
            apronHeightCm: { type: Type.NUMBER },
            stretcherHeightCm: { type: Type.NUMBER },
            stretcherWidthCm: { type: Type.NUMBER },
            stretcherThicknessCm: { type: Type.NUMBER },
            topOverhangCm: { type: Type.NUMBER },
            jointType: { type: Type.STRING, enum: ['dowel', 'mortise_tenon', 'screw', 'butterfly', 'butt'] },
            backrestHeightCm: { type: Type.NUMBER },
            backrestAngleDeg: { type: Type.NUMBER },
            seatDepthCm: { type: Type.NUMBER },
            shelfTiers: { type: Type.NUMBER },
            legAngleDeg: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["furnitureType", "lengthCm", "widthCm", "thicknessCm", "legCount", "legWidthCm", "apronHeightCm", "stretcherHeightCm", "stretcherWidthCm", "stretcherThicknessCm", "topOverhangCm", "jointType", "confidence", "reasoning"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as SimulationExtractionResult;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export const compareFurnitureDesigns = async (
  imageA: string,
  imageB: string,
  userContext: string
): Promise<StructureComparisonResult> => {
  try {
    const ai = getAiClient();
    
    const getParts = (url: string) => {
        const mimeMatch = url.match(/^data:(.*);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const data = url.split(',')[1] || url;
        return { mimeType, data };
    };

    const imgA = getParts(imageA);
    const imgB = getParts(imageB);

    const parts = [
      { inlineData: { mimeType: imgA.mimeType, data: imgA.data } },
      { inlineData: { mimeType: imgB.mimeType, data: imgB.data } },
      { text: `
        COMPARE these two furniture designs (Image 1 = Design A, Image 2 = Design B) for Moonler (Samanea Saman Wood).
        Context: ${userContext}

        ${WOOD_SPECS_CONTEXT}

        Act as the Expert Panel. Compare them on:
        1. Strength vs Density (0.53g/cm3).
        2. Production Feasibility (Dowel Joinery + Strategic Screw usage).
        3. Risk of Warping/Shrinkage.

        Output strictly JSON. BILINGUAL (English & Thai).
      `}
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            winner: { type: Type.STRING, enum: ["A", "B", "Draw"] },
            summaryVerdict: { type: Type.STRING },
            scoreA: { type: Type.NUMBER },
            scoreB: { type: Type.NUMBER },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metricName: { type: Type.STRING },
                  valueA: { type: Type.STRING },
                  valueB: { type: Type.STRING },
                  winner: { type: Type.STRING, enum: ["A", "B", "Draw"] }
                }
              }
            },
            prosA: { type: Type.ARRAY, items: { type: Type.STRING } },
            consA: { type: Type.ARRAY, items: { type: Type.STRING } },
            prosB: { type: Type.ARRAY, items: { type: Type.STRING } },
            consB: { type: Type.ARRAY, items: { type: Type.STRING } },
            productionRecommendation: { type: Type.STRING }
          },
          required: ["winner", "summaryVerdict", "scoreA", "scoreB", "metrics", "prosA", "consA", "prosB", "consB", "productionRecommendation"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as StructureComparisonResult;

  } catch (error) {
    console.error("Gemini Comparison Error:", error);
    throw error;
  }
};