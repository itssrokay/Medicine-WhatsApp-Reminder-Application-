import React, { useState, useContext } from 'react';
import axios from 'axios';
import './Gpt.css'; // Make sure to create this CSS file
import { AuthContext } from './AuthContext';

const Gpt = ({ onReminderAdded }) => {
  const { authState } = useContext(AuthContext);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const addReminder = async () => {
    if (!photo) {
      alert('Please select an image first');
      return;
    }
  
    setIsLoading(true);
    const formData = new FormData();
    formData.append('photo', photo);
  
    try {
      const res = await axios.post("http://localhost:9000/generateReminder", formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authState.token}`  // Add this line
        }
      });
  
      console.log("Response from server:", res.data);
      
      // Add the generated reminder
      const { reminderMsg, remindAt } = res.data.reminder;
      await axios.post("http://localhost:9000/addReminder", 
        { reminderMsg, remindAt },
        { headers: { Authorization: `Bearer ${authState.token}` } }  // Add this line
      );
      
      onReminderAdded();
      setPhoto(null);
      setPreviewUrl(null);
      alert(`Reminder added: ${reminderMsg} at ${new Date(remindAt).toLocaleString()}`);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="gpt-container">
      <h2>Add Reminder from Image</h2>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="file-input"
      />
      {previewUrl && (
        <div className="image-preview-container">
          <img src={previewUrl} alt="Preview" className="preview-image" />
        </div>
      )}
      <button 
        onClick={addReminder} 
        disabled={!photo || isLoading}
        className="add-button"
      >
        {isLoading ? 'Processing Image...' : 'Add Reminder from Image'}
      </button>
    </div>
  );
};

export default Gpt;