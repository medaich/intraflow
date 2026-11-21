import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import DashboardLayout from "./pages/dashboard/dashboard-layout";
import DashboardOverview from "./pages/dashboard/overview";
import Profile from "./pages/dashboard/profile";
import Board from "./pages/dashboard/project-view/board";
import Calendar from "./pages/dashboard/project-view/calendar";
import ProjectLayout from "./pages/dashboard/project-view/project-layout";
import Stats from "./pages/dashboard/project-view/stats";
import Task from "./pages/dashboard/project-view/task";
import Tasks from "./pages/dashboard/project-view/tasks";
import Projects from "./pages/dashboard/projects";
import UserDetailPage from "./pages/dashboard/user";
import UsersPage from "./pages/dashboard/users";
import TeamsPage from "./pages/dashboard/teams";
import TeamDetailPage from "./pages/dashboard/team-detail";
import MyTeamPage from "./pages/dashboard/my-team";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import ConfirmEmail from "./pages/confirm-email";
import NotFound from "./pages/not-found";
import ThemeProvider from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/route-guards/protected-route";
import { AdminRoute } from "./components/route-guards/admin-route";

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="confirm-email" element={<ConfirmEmail />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardLayout />}>
              {/* Main Dashboard Index */}
              <Route index element={<DashboardOverview />} />

              {/* Personal / Global Workflow Views */}
              <Route path="board" element={<Board />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:taskId" element={<Task />} />
              <Route path="stats" element={<Stats />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="profile" element={<Profile />} />
              <Route path="my-team" element={<MyTeamPage />} />

              {/* Projects Management */}
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projId" element={<ProjectLayout />}>
                <Route index element={<Navigate to="board" replace />} />
                <Route path="board" element={<Board />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/:taskId" element={<Task />} />
                <Route path="stats" element={<Stats />} />
                <Route path="calendar" element={<Calendar />} />
              </Route>

              {/* Administrator Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="teams" element={<TeamsPage />} />
                <Route path="teams/:teamId" element={<TeamDetailPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/:userId" element={<UserDetailPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
