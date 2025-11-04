export type WorkerStatus = 'Active' | 'Fired';

export interface Worker {
  id: string;
  ownerId: string;
  name: string;
  role?: string;
  rateType: 'monthly' | 'hourly';
  rate: number;
  status: WorkerStatus;
  terminationDate?: number; 
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  ownerId: string;
  workerId: string;
  workerNameAtTime?: string;
  amount: number;
  date: number; 
  method?: string;
  notes?: string;
  createdAt: number;
}

export interface Income {
  id: string;
  ownerId: string;
  source: string;
  amount: number;
  date: number; 
  notes?: string;
  createdAt: number;
}
