// ==========================================
// Intraflow Domain TypeScript Models
// Synchronized with Backend Contract
// ==========================================

export type UserRole = "ADMIN" | "EMPLOYEE";
export type TeamMemberRole = "MODERATOR" | "MEMBER";

export interface UserMembership {
  teamId: number;
  role: TeamMemberRole;
}

export interface User {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  membership: UserMembership | null;
  createdAt: string;
}

export interface AuthSessionUser {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface TeamMemberUser {
  userId: number;
  name: string;
  role?: string;
}

export interface TeamMember {
  id?: number;
  userId: number;
  teamId?: number;
  name?: string;
  email?: string;
  role: TeamMemberRole;
  joinedAt?: string;
  createdAt?: string;
  user?: TeamMemberUser;
}

export interface Team {
  teamId: number;
  name: string;
  description: string | null;
  createdAt: string;
  members?: TeamMember[];
}

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export interface ProjectProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface Project {
  projectId: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  teamId: number | null;
  createdBy: number;
  progress: number | ProjectProgress;
  isOverdue: boolean;
  createdAt: string;
}

export function getProjectProgressPercent(
  progress: number | ProjectProgress | undefined | null
): number {
  if (typeof progress === "number") return progress;
  if (progress && typeof progress.percent === "number") return progress.percent;
  return 0;
}

export type TaskStatus =
  | "UNASSIGNED"
  | "PENDING"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskTimeState = "UPCOMING" | "ACTIVE" | "OVERDUE" | "DONE";

export interface TaskAssignee {
  userId: number;
  name: string;
  role: UserRole;
}

export interface Task {
  taskId: number;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  timeState: TaskTimeState;
  isBlocked: boolean;
  blockedBy: number[];
  dependsOn: number[];
  projectId: number | null;
  assignedTo: TaskAssignee | null;
  startDate: string;
  endDate: string;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TaskComment {
  commentId: number;
  taskId: number;
  content: string;
  isSystem: boolean;
  user: {
    userId: number;
    name: string;
  } | null;
  createdAt: string;
}

export interface TaskAttachment {
  attachmentId: number;
  taskId: number;
  originalName: string;
  contentType: string;
  size: number;
  uploadedBy: {
    userId: number;
    name: string;
  };
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
