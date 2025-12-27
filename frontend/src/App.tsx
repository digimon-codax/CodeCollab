import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';

function App() {
    const token = localStorage.getItem('authToken');
    const isAuthenticated = !!token;

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
                path="/dashboard"
                element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
            />
            <Route
                path="/editor/:projectId"
                element={isAuthenticated ? <EditorPage /> : <Navigate to="/login" />}
            />
            <Route
                path="/"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
            />
        </Routes>
    );
}

export default App;
