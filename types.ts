
export interface WoodProperties {
  name: string;
  density: number; // kg/m3
  moe: number; // Modulus of Elasticity (MPa)
  mor: number; // Modulus of Rupture (MPa)
  description: string;
}

export interface CalculationInputs {
  length: number; // cm
  width: number; // cm
  thickness: number; // cm
  load: number; // kg
  loadType: 'center' | 'distributed';
}

export interface CalculationResult {
  deflection: number; // mm
  bendingStress: number; // MPa
  safetyFactor: number;
  isSafe: boolean;
  maxLoadRecommended: number; // kg
  weightOfBoard: number; // kg
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isError?: boolean;
}

export interface StructuralDimensions {
  overall: string;        // e.g. "W572 x D462 x H765 mm"
  legDimensions: string;  // e.g. "30x30 mm"
  materialThickness: string; // e.g. "20mm seat, 30mm rails"
  angles: string;         // e.g. "Back rake 105°, Rear leg 73°"
  joineryDetails: string; // e.g. "Mortise depth 15mm, 10mm dowels"
}

export interface WeakPoint {
  issue: string; // The description of the problem
  box_2d: number[]; // [ymin, xmin, ymax, xmax] in percentages (0-100)
}

export interface ExpertOpinion {
  role: string; // e.g., "Structural Engineer"
  analysis: string; // The specific observation
  confidence: number; // 1-10
}

export interface StructuralAnalysisResult {
  furnitureType: string;
  estimatedMaxLoadKg: number;
  structuralScore: number; // 1-10
  expertOpinions: ExpertOpinion[]; // Panel of 5 experts
  analysisSummary: string;
  joineryAssessment: string; // Assessment of joints/connections
  weakPoints: WeakPoint[]; // Updated to include coordinates
  improvementSuggestions: string[];
  safetyWarning: string;
  dimensions: StructuralDimensions;
}

export interface DamageAnalysisResult {
  damageType: string; // e.g. "Crack", "Split", "Rot"
  severityLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  isRepairable: boolean; // True = Repairable, False = Do Not Repair
  recommendation: string; // e.g. "Repair with Butterfly Key" or "Discard immediately"
  expertOpinions: ExpertOpinion[]; // Panel of 5 experts
  causeAnalysis: string; // Why did it break?
  repairabilityScore: number; // 1-10
  repairGuide: string[]; // Steps to fix
  safetyAssessment: string; // Can it still be used?
  toolsNeeded: string[];
}

export interface ComparisonMetric {
  metricName: string; // e.g. "Max Load", "Production Ease"
  valueA: string | number;
  valueB: string | number;
  winner: 'A' | 'B' | 'Draw';
}

export interface StructureComparisonResult {
  winner: 'A' | 'B' | 'Draw';
  summaryVerdict: string;
  scoreA: number;
  scoreB: number;
  metrics: ComparisonMetric[];
  prosA: string[];
  consA: string[];
  prosB: string[];
  consB: string[];
  productionRecommendation: string; // Which one is better for Moonler production?
}

export interface SimulatorInputs {
  type: 'table' | 'bench' | 'shelf' | 'cantilever' | 'chair';
  length: number; // cm
  width: number;  // cm
  thickness: number; // cm
  load: number;   // kg
  legCount: number;
  legWidth: number; // cm
  legThickness: number; // cm
  legHeight: number; // cm
  apronHeight: number; // cm
  apronThickness: number; // cm
  stretcherHeight: number; // cm
  stretcherWidth: number; // cm
  stretcherThickness: number; // cm
  topOverhang: number; // cm
  jointType: 'dowel' | 'mortise_tenon' | 'screw' | 'butterfly' | 'butt';
  jointThickness: number; // mm
  jointLength: number; // mm
  jointWidth: number; // mm
  jointsPerConnection: number;
  backrestHeight: number; // cm
  backrestAngle: number; // degrees
  backrestLoad: number; // kg
  armrestLoad: number; // kg
  legAngle: number; // degrees
  shelfTiers: number;
  seatDepth: number; // cm
}

export interface SimulationExtractionResult {
  furnitureType: 'table' | 'bench' | 'shelf' | 'cantilever' | 'chair';
  lengthCm: number;
  widthCm: number;
  thicknessCm: number;
  legCount: number;
  legWidthCm: number;
  legThicknessCm?: number;
  apronHeightCm: number;
  stretcherHeightCm: number;
  stretcherWidthCm: number;
  stretcherThicknessCm: number;
  topOverhangCm: number;
  jointType: 'dowel' | 'mortise_tenon' | 'screw' | 'butterfly' | 'butt';
  backrestHeightCm?: number;
  backrestAngleDeg?: number;
  legAngleDeg?: number;
  shelfTiers?: number;
  seatDepthCm?: number;
  confidence: number;
  reasoning: string;
}

export enum AppTab {
  CALCULATOR = 'calculator',
  LOAD_SIMULATOR = 'load_simulator',
  SMART_ANALYSIS = 'smart_analysis',
  COMPARE = 'compare',
  DAMAGE_CHECK = 'damage_check',
  AI_CONSULTANT = 'ai_consultant',
  INFO = 'info'
}
