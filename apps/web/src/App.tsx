import { Component, type ErrorInfo, type ReactNode } from "react";
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
import StudentProgress from "./pages/StudentProgress";
const qc=new QueryClient();

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#100d18", color: "#f4f0ff", fontFamily: "system-ui, sans-serif" }}><div style={{ maxWidth: 560, textAlign: "center" }}><p style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase" }}>Application error</p><h1 style={{ margin: "12px 0 0", fontSize: 24 }}>Konten gagal dirender</h1><p style={{ margin: "12px 0 0", color: "#a8a1b5", lineHeight: 1.6 }}>Muat ulang halaman. Jika masalah tetap ada, buka console untuk melihat error runtime.</p><button onClick={() => window.location.reload()} style={{ marginTop: 20, border: 0, borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>Muat ulang</button></div></div>;
    }
    return this.props.children;
  }
}

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
        <AppErrorBoundary>
          <BrowserRouter>
            <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route path="/" element={<Protected><Layout><Dashboard/></Layout></Protected>}/>
            <Route path="/courses" element={<Protected><Layout><Courses/></Layout></Protected>}/>
            <Route path="/courses/:id" element={<Protected><Layout><CourseDetail/></Layout></Protected>}/>
            <Route path="/material/:id" element={<Protected><Layout><MaterialView/></Layout></Protected>}/>
            <Route path="/quiz/:id" element={<Protected><Layout><Quiz/></Layout></Protected>}/>
            <Route path="/rekap" element={<Protected roles={["ADMIN","DOSEN"]}><Layout><Rekap/></Layout></Protected>}/>
            <Route path="/rekap/:courseId/student/:studentId" element={<Protected roles={["ADMIN","DOSEN"]}><Layout><StudentProgress/></Layout></Protected>}/>
            <Route path="/manage" element={<Protected roles={["ADMIN","DOSEN"]}><Layout><Manage/></Layout></Protected>}/>
            <Route path="/users" element={<Protected roles={["ADMIN"]}><Layout><Users/></Layout></Protected>}/>
            <Route path="*" element={<Navigate to="/"/>}/>
            </Routes>
          </BrowserRouter>
        </AppErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  )
}
