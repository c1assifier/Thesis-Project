import { http } from "./http";

export interface PortalProfile {
  level: string;
  points: number;
}

export interface PortalActivity {
  label: string;
}

export interface PortalRecommendation {
  title: string;
  description: string;
}

export interface PortalDashboardStats {
  progress_percent: number;
  completed_modules: number;
  total_modules: number;
  solved_tasks: number;
  total_tasks: number;
  accuracy_percent: number;
}

export interface PortalDashboard {
  title: string;
  subtitle: string;
  student_label: string;
  profile: PortalProfile;
  activity: PortalActivity[];
  stats: PortalDashboardStats;
  recommendations: PortalRecommendation[];
}

export interface PortalCourseModule {
  id: number;
  linked_course_id: number | null;
  linked_module_id: number | null;
  linked_lesson_id: number | null;
  title: string;
  status: string;
  progress_percent: number;
  progress_label: string;
  badge: string;
}

export interface PortalCourseStructure {
  title: string;
  module_count_label: string;
  modules: PortalCourseModule[];
}

export interface PortalDiagnosticGate {
  title: string;
  description: string;
  note: string;
  action_label: string;
  locked_modules: string[];
}

export interface PortalBootstrap {
  app_title: string;
  dashboard: PortalDashboard;
  diagnostic_gate: PortalDiagnosticGate;
  course_structure: PortalCourseStructure;
}

export interface PortalChecklistItem {
  title: string;
  completed: boolean;
  linked_lesson_id: number | null;
}

export interface PortalModuleDetails {
  id: number;
  linked_course_id: number | null;
  linked_module_id: number | null;
  linked_lesson_id: number | null;
  title: string;
  status: string;
  badge: string;
  progress_percent: number;
  progress_label: string;
  adaptive_label: string;
  adaptive_description: string;
  theory_items: PortalChecklistItem[];
  practice_items: PortalChecklistItem[];
  action_label: string;
}

export async function getPortalBootstrap(userId: number): Promise<PortalBootstrap> {
  const response = await http.get<PortalBootstrap>("/portal/bootstrap", {
    params: { user_id: userId },
  });
  return response.data;
}

export async function getPortalModuleDetails(moduleId: number, userId: number): Promise<PortalModuleDetails> {
  const response = await http.get<PortalModuleDetails>(`/portal/modules/${moduleId}`, {
    params: { user_id: userId },
  });
  return response.data;
}
