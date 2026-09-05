import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { REACT_APP_HOST_HOOKS } from "../../config/config";

const MessageList = ({ onSelectMessage }) => {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null); 
  const location = useLocation(); 

  useEffect(() => {
    const getCodeFromUrl = () => {
      const urlParams = new URLSearchParams(location.search);
      return urlParams.get('code'); 
    };

    const fetchMessages = async () => {
      const code = getCodeFromUrl(); 
      if (!code) {
        setError("No se encontró el código de autorización en la URL.");
        return;
      }

      try {
        const response = await fetch(`${REACT_APP_HOST_HOOKS}/api/messages?code=${code}`);
        if (!response.ok) {
          throw new Error("Error al obtener los mensajes");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
          setError("La respuesta del servidor no es válida.");
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los mensajes.");
      }
    };

    fetchMessages();
  }, [location.search]); 

  return (
    <div className="message-list">
      <h2>Mensajes Recibidos</h2>
      {error ? (
        <p className="error">{error}</p>
      ) : messages.length === 0 ? (
        <p>No hay mensajes aún.</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message.message_id}>
              <strong>{message.sender_name}:</strong> {message.text}
              <button onClick={() => onSelectMessage(message)}>Responder</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MessageList;
