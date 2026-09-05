import { useCallback } from "react";
import { apiRequest } from '../api/api.js';

const useCreateTemplate = () => {
  const createTemplate = useCallback(async (formValues, selectedImages) => {
    const formData = new FormData();
    formData.append("name", formValues.name);
    formData.append("content", formValues.content);
    const publications = Array.isArray(formValues.assignedPublications)
      ? formValues.assignedPublications
      : String(formValues.assignedPublications || '').split(',').map((item) => item.trim()).filter(Boolean);

    publications.forEach((publication) => formData.append('assignedPublications', publication));

    selectedImages.forEach(image => {
      formData.append("images-posventa", image);
    });

    return apiRequest('/api/templates', {
      method: "POST",
      body: formData,
    });
  }, []);

  return createTemplate;
};

export default useCreateTemplate;
