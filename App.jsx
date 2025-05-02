import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import UsersList from "./pages/UsersList";
import AdminDashboard from "./pages/AdminDashboard"; // ✅ Add this line

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<UsersList />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} /> {/* ✅ New Route */}
      </Routes>
    </Router>
  );
}

export default App;

