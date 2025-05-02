import { useState, useEffect } from "react";
import axios from "axios";
import ThreeScene from "../components/ThreeScene";
import CameraRecognition from "../components/CameraRecognition";
import { motion } from "framer-motion";

function Home() {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState({
    name: "",
    enrollmentYear: "",
    department: "",
    section: "",
    gender: "",
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchAttendance();
    fetchUsers();
  }, []);

  const fetchAttendance = () => {
    axios.get("http://127.0.0.1:5000/api/attendance").then((res) => setAttendance(res.data));
  };

  const fetchUsers = () => {
    axios
      .get("http://127.0.0.1:5000/api/users")
      .then((res) => setUsers(res.data))
      .catch((error) => console.error("Failed to fetch users", error));
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    let sorted = [...attendance];

    if (value === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (value === "time") {
      sorted.sort((a, b) => new Date(a.time) - new Date(b.time));
    } else if (value === "date") {
      sorted.sort((a, b) => a.time.split("T")[0].localeCompare(b.time.split("T")[0]));
    } else if (value === "day") {
      const getWeekDay = (dateStr) => new Date(dateStr).getDay();
      sorted.sort((a, b) => getWeekDay(a.time) - getWeekDay(b.time));
    }

    setAttendance(sorted);
  };

  const handleDeleteClick = () => {
    const choice = window.prompt(
      "Type 'all' to delete all attendance or 'today' to delete today's attendance"
    );

    if (choice === "all") {
      axios.delete("http://localhost:5000/deleteAllAttendance").then(() => {
        setAttendance([]);
        alert("All attendance deleted!");
      });
    } else if (choice === "today") {
      axios.delete("http://localhost:5000/deleteTodayAttendance").then(() => {
        const today = new Date().toISOString().split("T")[0];
        const updated = attendance.filter(
          (item) => !item.time.startsWith(today)
        );
        setAttendance(updated);
        alert("Today's attendance deleted!");
      });
    }
  };

  const handleImageCapture = (capturedImages) => {
    if (captureMode === "addUser") {
      const allFieldsFilled = Object.values(pendingUser).every((val) => val.trim());
      if (!allFieldsFilled) return alert("Please fill all user details.");

      setLoading(true);
      axios
        .post("http://127.0.0.1:5000/api/add-user", {
          ...pendingUser,
          images: capturedImages,
        })
        .then(() => {
          alert("User Added Successfully!");
          setPendingUser({ name: "", enrollmentYear: "", department: "", section: "", gender: "" });
          fetchAttendance();
          fetchUsers();
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setSelectedImage({
        image: capturedImages[0],
        forAttendance: true,
      });
    }
  };

  const handleFileUpload = async () => {
    if (!file) return alert("Please select an Excel file.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await axios.post("http://127.0.0.1:5000/api/upload-users", formData);
      alert("Users uploaded successfully!");
      fetchAttendance();
      fetchUsers();
    } catch (error) {
      alert("Error uploading users.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative p-6 min-h-screen text-white bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <ThreeScene />

      <motion.h2
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl text-center font-bold z-10 relative"
      >
        Face Detection Attendance System
      </motion.h2>

      <div className="grid grid-cols-2 gap-6 mt-6 relative z-10">
        {/* ✅ Attendance Section - Updated to table format */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg backdrop-blur-md"
        >
          <div className="flex justify-between mb-4 items-center">
            <h3 className="text-xl font-bold">Today's Attendance</h3>
            <div className="flex gap-2">
              <select onChange={handleSortChange} className="px-3 py-1 rounded text-black">
                <option value="">Sort By</option>
                <option value="name">Name</option>
                <option value="time">Time</option>
                <option value="day">Day</option>
                <option value="date">Date</option>
              </select>
              <button
                onClick={handleDeleteClick}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="overflow-auto max-h-96">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-2 border border-gray-600">Name</th>
                  <th className="p-2 border border-gray-600">Time</th>
                  <th className="p-2 border border-gray-600">Image</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((item, index) => (
                  <tr key={index} className="border-b border-gray-600 hover:bg-gray-700">
                    <td className="p-2 border border-gray-600">{item.name}</td>
                    <td className="p-2 border border-gray-600">
                      {new Date(item.time).toLocaleString()}
                    </td>
                    <td className="p-2 border border-gray-600">
                      {item.imageUrl && (
                        <button 
                          onClick={() => setSelectedImage({ image: item.imageUrl, forAttendance: false })}
                          className="text-blue-400 underline"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ✅ Add New User */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg backdrop-blur-md"
        >
          <h3 className="text-xl mb-4 text-center">Add New User</h3>
          {["name", "enrollmentYear", "department", "section", "gender"].map((field) =>
            field === "gender" ? (
              <select
                key={field}
                value={pendingUser.gender}
                onChange={(e) => setPendingUser({ ...pendingUser, gender: e.target.value })}
                className="p-2 mb-2 w-full bg-gray-700 rounded-md text-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <input
                key={field}
                type="text"
                placeholder={`Enter ${field}`}
                value={pendingUser[field]}
                onChange={(e) => setPendingUser({ ...pendingUser, [field]: e.target.value })}
                className="p-2 mb-2 w-full bg-gray-700 rounded-md"
              />
            )
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-green-500 px-4 py-2 rounded-md w-full mb-2"
            onClick={() => {
              const allFieldsFilled = Object.values(pendingUser).every((val) => val.trim());
              if (!allFieldsFilled) return alert("Fill all fields before capturing.");
              setCaptureMode("addUser");
              setCameraOpen(true);
            }}
          >
            Add User & Capture Images
          </motion.button>
        </motion.div>

        {/* ✅ Bulk Upload */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg backdrop-blur-md"
        >
          <h3 className="text-xl mb-4 text-center">Bulk Upload Users</h3>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="p-2 mb-2 w-full bg-gray-700 rounded-md"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-blue-500 px-4 py-2 rounded-md w-full"
            onClick={handleFileUpload}
          >
            Upload Users
          </motion.button>
        </motion.div>
      </div>

      {/* ✅ Open Camera */}
      <div className="text-center mt-6">
        <button
          className="bg-blue-500 px-6 py-3 rounded-md text-xl"
          onClick={() => {
            setCaptureMode("attendance");
            setCameraOpen(true);
          }}
        >
          Open Camera
        </button>
      </div>

      {/* ✅ Camera Modal */}
      {cameraOpen && (
        <CameraRecognition
          onClose={() => setCameraOpen(false)}
          onCapture={handleImageCapture}
          captureMode={captureMode}
        />
      )}

      {/* ✅ Image Preview Modal */}
      {selectedImage && !selectedImage.forAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-black">
            <img 
              src={`http://localhost:5000${selectedImage.image}`} 
              alt="Captured Face" 
              className="w-full max-w-md rounded-lg mb-2"
            />
            <button 
              className="bg-red-500 px-4 py-2 text-white rounded w-full"
              onClick={() => setSelectedImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      
    </div>
  );
}

export default Home;
