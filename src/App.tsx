import { BrowserRouter, Route, Routes } from "react-router";
import DashboardLayout from "./pages/dashboard/dashboard-layout";
import Profile from "./pages/dashboard/profile";
import Board from "./pages/dashboard/project-view/board";
import Calendar from "./pages/dashboard/project-view/calendar";
import ProjectLayout from "./pages/dashboard/project-view/project-layout";
import Stats from "./pages/dashboard/project-view/stats";
import Task from "./pages/dashboard/project-view/task";
import Tasks from "./pages/dashboard/project-view/tasks";
import Projects from "./pages/dashboard/projects";
import User from "./pages/dashboard/user";
import Users from "./pages/dashboard/users";
import Login from "./pages/login";
import ThemeProvider from "./contexts/ThemeContext";

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />

          <Route path="dashboard" element={<DashboardLayout />}>
            <Route path="projects" element={<Projects />}>
              <Route path=":projId" element={<ProjectLayout />}>
                {/* Tasks per project */}
                <Route path="stats" element={<Stats />} />
                <Route path="board" element={<Board />} />

                <Route path="tasks" element={<Tasks />}>
                  <Route path=":taskId" element={<Task />} />
                </Route>

                <Route path="calendar" element={<Calendar />} />
              </Route>
            </Route>

            {/* All tasks */}
            <Route path="stats" element={<Stats />} />
            <Route path="board" element={<Board />} />

            <Route path="tasks" element={<Tasks />}>
              <Route path=":taskId" element={<Task />} />
            </Route>

            <Route path="calendar" element={<Calendar />} />

            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<Users />}>
              <Route path=":userId" element={<User />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
