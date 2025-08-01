import { BrowserRouter, Route, Routes } from "react-router";
import Login from "./pages/login";
import DashboardLayout from "./pages/dashboard/dashboard-layout";
import Projects from "./pages/dashboard/projects";
import Users from "./pages/dashboard/users";
import User from "./pages/dashboard/user";
import ProjectLayout from "./pages/dashboard/project-view/project-layout";
import Stats from "./pages/dashboard/project-view/stats";
import Tasks from "./pages/dashboard/project-view/tasks";
import Board from "./pages/dashboard/project-view/board";
import { Calendar } from "lucide-react";
import Task from "./pages/dashboard/project-view/task";
import Profile from "./pages/dashboard/profile";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<Login />} />

        <Route path="dashboard" element={<DashboardLayout />}>
          <Route path="projects" element={<Projects />}>
            <Route path=":projId" element={<ProjectLayout />}>
              <Route path="stats" element={<Stats />} />
              <Route path="board" element={<Board />} />

              <Route path="tasks" element={<Tasks />}>
                <Route path=":taskId" element={<Task />} />
              </Route>

              <Route path="calendar" element={<Calendar />} />
            </Route>
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="users" element={<Users />}>
            <Route path=":userId" element={<User />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
