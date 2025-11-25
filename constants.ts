
import { WoodProperties } from './types';

// Samanea Saman (Rain Tree / Chamchuri) properties
// Updated based on specific scientific data provided by user.
export const SAMANEA_PROPERTIES: WoodProperties = {
  name: "Samanea Saman (Rain Tree)",
  density: 530, // Air-dry Density ~0.53 g/cm3
  moe: 8500, // ~8.5 GPa (Soft-Medium range)
  mor: 60, // ~60 MPa
  description: "ไม้จามจุรี (Rain Tree) เป็นไม้เนื้ออ่อนถึงแข็งปานกลาง (Soft to Medium Hardwood) ที่ความชื้น 12% มีความหนาแน่น 550-700 kg/m³ การหดตัวต่ำมาก (Total Shrinkage Tangential 1.8%, Radial 1.0%) ทนทานตามธรรมชาติระดับ 6 (Natural durability index 6). ไม้ของ Moonler ผ่านการอบแห้ง (Kiln Dry) จนความชื้นเหลือ 15-20% เพื่อป้องกันการบิดตัว"
};

export const MOCK_CHART_DATA = [
  { load: 0, deflection: 0 },
  { load: 20, deflection: 1.4 },
  { load: 40, deflection: 2.9 },
  { load: 60, deflection: 4.8 },
  { load: 80, deflection: 6.9 },
  { load: 100, deflection: 9.5 },
  { load: 120, deflection: 14.5 }, // Failure point simulated
];
