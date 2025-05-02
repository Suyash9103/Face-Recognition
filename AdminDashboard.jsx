import { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function AdminDashboard() {
  const [deptStats, setDeptStats] = useState([]);
  const [hourStats, setHourStats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [absentees, setAbsentees] = useState([]);

  useEffect(() => {
    // 1. Get summary charts
    axios.get("http://127.0.0.1:5000/api/attendance-summary").then((res) => {
      setDeptStats(res.data.by_department);
      setHourStats(res.data.by_hour);
    });

    // 2. Get all users
    axios.get("http://127.0.0.1:5000/api/users").then((res) => {
      setAllUsers(res.data);
    });

    // 3. Get today's attendance
    axios.get("http://127.0.0.1:5000/api/attendance").then((res) => {
      setAttendanceToday(res.data);
    });
  }, []);

  useEffect(() => {
    const presentNames = attendanceToday.map((a) => a.name);
    const absenteesList = allUsers.filter((user) => !presentNames.includes(user.name));
    setAbsentees(absenteesList);
  }, [allUsers, attendanceToday]);

  const deptChart = {
    labels: deptStats.map((d) => d.department),
    datasets: [
      {
        label: "Attendance by Department",
        data: deptStats.map((d) => d.count),
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0", "#9966FF"],
      },
    ],
  };

  const timeChart = {
    labels: hourStats.map((h) => `${h.hour}:00`),
    datasets: [
      {
        label: "Attendance Count",
        data: hourStats.map((h) => h.count),
        backgroundColor: "#4BC0C0",
      },
    ],
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">📊 Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-semibold mb-2">By Department</h3>
          <Pie data={deptChart} />
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-semibold mb-2">Hourly Attendance</h3>
          <Bar data={timeChart} options={{ scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* ✅ Present Today */}
        <div className="bg-green-100 border border-green-400 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 text-green-800">✅ Present Today</h3>
          <ul className="list-disc list-inside text-green-900">
            {attendanceToday.map((entry, idx) => (
              <li key={idx}>{entry.name}</li>
            ))}
          </ul>
        </div>

        {/* ❌ Absentees */}
        <div className="bg-red-100 border border-red-400 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 text-red-800">❌ Absent Today</h3>
          <ul className="list-disc list-inside text-red-900">
            {absentees.map((user, idx) => (
              <li key={idx}>{user.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
