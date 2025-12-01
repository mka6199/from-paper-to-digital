export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s|-|\(|\)/g, '');
  return /^\+?[\d]{10,15}$/.test(cleaned);
};

export const validateSalary = (salary: number): boolean => {
  return salary > 0 && salary < 1000000;
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateEmployeeId = (id: string): boolean => {
  return id.trim().length >= 2 && id.trim().length <= 20;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateSalaryDueDay = (day: number): boolean => {
  return day >= 1 && day <= 31;
};
