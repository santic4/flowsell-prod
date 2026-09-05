import { useCallback, useState } from 'react';
import { apiRequest } from '../api/api.js';

export const useUpdateTemplate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateTemplate = useCallback(async (templateId, formDataObject, deleteImageEdit, editImages ) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', formDataObject.name);
    formData.append('content', formDataObject.content);
    formData.append('attachmentsRaw', JSON.stringify(deleteImageEdit));

    const pubs = formDataObject.assignedPublications
      ? formDataObject.assignedPublications.split(',').map(s => s.trim())
      : [];

    pubs.forEach(pub => formData.append('assignedPublications', pub));
    editImages.forEach(file => formData.append('images-posventa', file));

    try {
      return await apiRequest(`/api/templates/${templateId}`, {
        method: 'PUT',
        body: formData
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateTemplate, loading, error };
};
