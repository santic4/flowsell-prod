import React, { useState } from "react";
import { REACT_APP_HOST_HOOKS } from "../../config/config";

const MessageReply = ({ message, templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleReply = async () => {
    await fetch(`${REACT_APP_HOST_HOOKS}/api/messages/${message.message_id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: selectedTemplate }),
    });
    alert("Mensaje enviado exitosamente");
  };

  return (
    <div className="message-reply">
      <h3>Responder a: {message.sender_name}</h3>
      <select
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
      >
        <option value="">Seleccionar Plantilla</option>
        {templates.map((template) => (
          <option key={template._id} value={template.content}>
            {template.name}
          </option>
        ))}
      </select>
      <button onClick={handleReply} disabled={!selectedTemplate}>
        Enviar Respuesta
      </button>
    </div>
  );
};

export default MessageReply;
