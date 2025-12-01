import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Worker } from '../services/workers';

// Root stack (Splash, Auth, Main tabs, Admin tabs)
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Admin: undefined;
  Notifications: undefined;
};

// Main tab navigator
export type MainTabParamList = {
  Dashboard: undefined;
  Workers: undefined;
  Notifications: undefined;
  History: undefined;
  Settings: undefined;
};

// Admin tab navigator
export type AdminTabParamList = {
  'Admin Panel': undefined;
};

// Workers stack
export type WorkersStackParamList = {
  WorkersList: undefined;
  WorkerProfile: {
    id: string;
    worker: {
      id: string;
      name: string;
      role: string;
      monthlySalaryAED: number;
      avatarUrl: string | null;
    };
  };
  AddWorker: undefined;
  EditWorker: {
    id: string;
  };
  PaySalary: {
    workerId: string;
    workerName: string;
    monthlySalaryAED: number;
  };
  PaymentHistory: {
    workerId: string;
    workerName: string;
  };
  PaymentConfirmation: {
    workerId: string;
    workerName: string;
    amount: number;
    date: string;
    method: string;
  };
  OTPConfirm: {
    workerId: string;
    workerName: string;
    phone: string;
  };
};

// History stack
export type HistoryStackParamList = {
  HistoryHome: undefined;
  MonthlyHistory: {
    year: number;
    month: number;
  };
  CustomRange: {
    start: Date;
    end: Date;
  };
};

// Settings stack
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  EditProfile: undefined;
};

// Admin stack
export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminWorkers: undefined;
  AdminPayments: undefined;
  AdminEditWorker: {
    id: string;
  };
  AdminEditPayment: {
    id: string;
  };
};

// Auth stack
export type AuthStackParamList = {
  AuthHome: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

// Composite types for nested navigation
export type WorkersScreenProps<T extends keyof WorkersStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<WorkersStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

export type HistoryScreenProps<T extends keyof HistoryStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HistoryStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

export type SettingsScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

export type AdminScreenProps<T extends keyof AdminStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AdminStackParamList, T>,
  BottomTabScreenProps<AdminTabParamList>
>;

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type DashboardScreenProps = BottomTabScreenProps<MainTabParamList, 'Dashboard'>;
