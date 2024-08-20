import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import DateTimePicker from "react-datetime-picker";
import Gpt from "./Gpt";
import { AuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [reminderMsg, setReminderMsg] = useState("");
  const [remindAt, setRemindAt] = useState();
  const [reminderList, setReminderList] = useState([]);
  const { authState, clearAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  
  const fetchReminders = () => {
    axios
      .get(`http://localhost:9000/getAllReminder?userId=${authState.user.id}`, {
        headers: { Authorization: `Bearer ${authState.token}` }
      })
      .then((res) => setReminderList(res.data));
  };

  useEffect(() => {
    if (authState.token) {
      fetchReminders();
    }
  }, [authState.token]);

  const addReminder = () => {
    axios
      .post("http://localhost:9000/addReminder", 
        { reminderMsg, remindAt, userId: authState.user.id },
        { headers: { Authorization: `Bearer ${authState.token}` } }
      )
      .then(res => {
        setReminderList(res.data);
        setReminderMsg("");
        setRemindAt();
      });
  };
  const deleteReminder = (id) => {
    axios.post("http://localhost:9000/deleteReminder", 
      { id },
      { headers: { Authorization: `Bearer ${authState.token}` } }
    )
      .then(res => setReminderList(res.data));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="homepage">
      <div className="homepage_header">
        <h1>WhatsApp Reminder ⏳</h1>
        <button onClick={handleLogout}>Logout</button>
        <input
          type="text"
          placeholder="Reminder notes here...."
          value={reminderMsg}
          onChange={(e) => setReminderMsg(e.target.value)}
        />
        
        <DateTimePicker
          value={remindAt}
          onChange={setRemindAt}
          minDate={new Date()}
          minutePlaceholder="mm"
          hourPlaceholder="hh"
          dayPlaceholder="DD"
          monthPlaceholder="MM"
          yearPlaceholder="YYYY"
        />
        <div className="button" onClick={addReminder}>
          Add Reminder 
        </div>
        <div className="button" onClick={handleLogout}>
          Logout
        </div>
      </div>

      <Gpt onReminderAdded={fetchReminders} />

      <div className="homepage_body">
        {reminderList.map(reminder => (
          <div className="reminder_card" key={reminder._id}>
            <h2>{reminder.reminderMsg}</h2>
            <h3>Remind Me at ⏰:</h3>
            <p>{new Date(reminder.remindAt).toLocaleString("en-US", {timeZone: "Asia/Kolkata"})}</p>
            <div className="button" onClick={() => deleteReminder(reminder._id)}>Delete</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;