import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="p-4 bg-black text-white flex justify-between">
      <h1 className="text-xl font-bold">FDAS</h1>
      <div>
        <Link to="/" className="mr-4">Home</Link>
        <Link to="/users" className="mr-4">List Users</Link>
        <Link to="/admin-dashboard">Admin Dashboard</Link> {/* ✅ New Link */}
      </div>
    </nav>
  );
}

export default Navbar;

