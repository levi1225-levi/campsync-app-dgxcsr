
import { useState, useEffect } from 'react';
import { camperService } from '@/services/database.service';
import { Camper, CamperMedicalInfo, EmergencyContact } from '@/types/camper';

export function useCampers(campId?: string) {
  const [campers, setCampers] = useState<Camper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampers = async () => {
    try {
      setLoading(true);
      const data = await camperService.getAll(campId);
      setCampers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching campers:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampers();
  }, [campId]);

  const createCamper = async (camper: Omit<Camper, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCamper = await camperService.create(camper);
      setCampers([...campers, newCamper]);
      return newCamper;
    } catch (err) {
      console.error('Error creating camper:', err);
      throw err;
    }
  };

  const updateCamper = async (id: string, updates: Partial<Camper>) => {
    try {
      const updatedCamper = await camperService.update(id, updates);
      setCampers(campers.map(c => c.id === id ? updatedCamper : c));
      return updatedCamper;
    } catch (err) {
      console.error('Error updating camper:', err);
      throw err;
    }
  };

  const deleteCamper = async (id: string) => {
    try {
      await camperService.delete(id);
      setCampers(campers.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting camper:', err);
      throw err;
    }
  };

  return {
    campers,
    loading,
    error,
    refetch: fetchCampers,
    createCamper,
    updateCamper,
    deleteCamper,
  };
}

export function useCamper(id: string) {
  const [camper, setCamper] = useState<Camper | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<CamperMedicalInfo | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCamperDetails = async () => {
    try {
      setLoading(true);
      const [camperData, medicalData, contactsData] = await Promise.all([
        camperService.getById(id),
        camperService.getMedicalInfo(id),
        camperService.getEmergencyContacts(id),
      ]);
      setCamper(camperData);
      setMedicalInfo(medicalData);
      setEmergencyContacts(contactsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching camper details:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCamperDetails();
    }
  }, [id]);

  const updateMedicalInfo = async (info: Omit<CamperMedicalInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const updated = await camperService.upsertMedicalInfo(info);
      setMedicalInfo(updated);
      return updated;
    } catch (err) {
      console.error('Error updating medical info:', err);
      throw err;
    }
  };

  const updateEmergencyContact = async (contact: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const updated = await camperService.upsertEmergencyContact(contact);
      setEmergencyContacts(contacts => {
        const existing = contacts.find(c => c.priorityOrder === contact.priorityOrder);
        if (existing) {
          return contacts.map(c => c.priorityOrder === contact.priorityOrder ? updated : c);
        }
        return [...contacts, updated];
      });
      return updated;
    } catch (err) {
      console.error('Error updating emergency contact:', err);
      throw err;
    }
  };

  return {
    camper,
    medicalInfo,
    emergencyContacts,
    loading,
    error,
    refetch: fetchCamperDetails,
    updateMedicalInfo,
    updateEmergencyContact,
  };
}
