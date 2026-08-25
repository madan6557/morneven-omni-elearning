import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import MaterialView from "./pages/MaterialView";
import Quiz from "./pages/Quiz";
import Rekap from "./pages/Rekap";
import Manage from "./pages/Manage";
import Users from "./pages/Users";
const qc=new QueryClient();

function Protected({children, roles}:{children:any; roles?:string[]}){
  const {user, loading}=useAuth();
  if(loading) return <div className="p-6">Loading...</div>;
  if(!user) return <Navigate to="/login"/>;
  if(roles && !roles.includes(user.role)) return <div className="p-6">Forbidden — role {user.role} tidak boleh akses.</div>;
  return children;
}

export default function App(){
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route path="/" element={<Protected><Layout><Dashboard/></Layout></Protected>}/>
            <Route path="/courses" element={<Protected><Layout><Courses/></Layout></Protected>}/>
            <Route path="/courses/:id" element={<Protected><Layout><CourseDetail/></Layout></Protected>}/>
            <Route path="/material/:id" element={<Protected><Layout><MaterialView/></Layout></Protected>}/>
            <Route path="/quiz/:id" element={<Protected><Layout><Quiz/></Layout></Protected>}/>
            <Route path="/rekap" element={<Protected roles={["ADMIN","DOSEN"]}><Layout><Rekap/></Layout></Protected>}/>
            <Route path="/manage" element={<Protected roles={["ADMIN","DOSEN"]}><Layout><Manage/></Layout></Protected>}/>
            <Route path="/users" element={<Protected roles={["ADMIN"]}><Layout><Users/></Layout></Protected>}/>
            <Route path="*" element={<Navigate to="/"/>}/>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
