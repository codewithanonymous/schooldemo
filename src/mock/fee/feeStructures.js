// Mock Fee Structures for School ERP (Class 1 to 10)
export const MOCK_FEE_TYPES = [
  { id: 1, fee_code: "TUIT", fee_name: "Tuition Fee", description: "Academic tuition and class instructional fees", is_active: true },
  { id: 2, fee_code: "BUS", fee_name: "Transport Fee", description: "School bus/van transport services", is_active: true },
  { id: 3, fee_code: "EXAM", fee_name: "Exam Fee", description: "Term assessments and final examinations fee", is_active: true },
  { id: 4, fee_code: "UNI", fee_name: "Uniform Fee", description: "School uniform and accessories", is_active: true }
];

// Generate expected fees based on Class Level (Tuition escalates with higher classes)
export const MOCK_FEE_STRUCTURES = Array.from({ length: 10 }, (_, index) => {
  const classNum = index + 1;
  const tuition = 15000 + (classNum - 1) * 3000; // Class 1: 15,000, Class 10: 42,000
  const transport = 8000;
  const exam = 2000;
  const uniform = 3000;
  
  return {
    class_id: classNum,
    class_name: `Class ${classNum}`,
    fees: [
      { fee_type_id: 1, fee_name: "Tuition Fee", amount: tuition },
      { fee_type_id: 2, fee_name: "Transport Fee", amount: transport },
      { fee_type_id: 3, fee_name: "Exam Fee", amount: exam },
      { fee_type_id: 4, fee_name: "Uniform Fee", amount: uniform }
    ],
    total_amount: tuition + transport + exam + uniform
  };
});

export const MOCK_ACADEMIC_YEARS = [
  { id: 1, year_name: "2025-2026", start_date: "2025-06-01", end_date: "2026-04-30", is_active: false },
  { id: 2, year_name: "2026-2027", start_date: "2026-06-01", end_date: "2027-04-30", is_active: true }
];
