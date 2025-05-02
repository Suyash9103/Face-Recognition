import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import ThreeScene from "../components/ThreeScene"; // 3D Animation

function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:5000/api/users").then((res) => setUsers(res.data));
  }, []);

  const handleDelete = (id) => {
    axios.delete(`http://127.0.0.1:5000/api/delete-user/${id}`).then(() => {
      alert("User Deleted Successfully");
      setUsers(users.filter((user) => user.id !== id));
    });
  };

  return (
    <div className="relative min-h-screen text-white bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/background.jpg')" }}>

      {/* 3D Animation */}
      <ThreeScene />

      <motion.h2
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl text-center font-bold"
      >
        Registered Users
      </motion.h2>

      <motion.div 
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="bg-gray-800 p-6 rounded-xl shadow-lg backdrop-blur-md mt-6"
      >
        <h3 className="text-xl mb-4 text-center">User List</h3>
        <table className="mt-4 w-full text-center">
          <thead>
            <tr className="bg-gray-700">
              <th>Name</th> <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index} className="border-b border-gray-600">
                <td>{user.name}</td>
                <td>
                  <button
                    className="bg-red-500 px-4 py-2 rounded-md"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

export default UsersList;
