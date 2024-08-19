import React, { useState } from 'react';
import axios from 'axios';

const Gpt = () => {
  const [photo, setPhoto] = useState(null);

  const handleFileChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const addReminder = () => {
    const formData = new FormData();
    formData.append('photo', photo);

    axios.post("http://localhost:9000/generateReminder", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(res => {
      const { reminderMsg, remindAt } = res.data;
      axios.post("http://localhost:9000/addReminder", { reminderMsg, remindAt })
        .then(res => {
          console.log(res.data);
          // Handle the response as needed
        });
    });

    setPhoto(null);
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
      />
      <button onClick={addReminder}>Add Reminder</button>
    </div>
  );
};

export default Gpt;
