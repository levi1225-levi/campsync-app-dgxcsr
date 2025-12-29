
import { useState, useEffect } from 'react';
import { campService } from '@/services/database.service';
import { Camp } from '@/types/camp';

export function useCamps() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCamps = async () => {
    try {
      setLoading(true);
      const data = await campService.getAll();
      setCamps(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching camps:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamps();
  }, []);

  const createCamp = async (camp: Omit<Camp, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCamp = await campService.create(camp);
      setCamps([...camps, newCamp]);
      return newCamp;
    } catch (err) {
      console.error('Error creating camp:', err);
      throw err;
    }
  };

  const updateCamp = async (id: string, updates: Partial<Camp>) => {
    try {
      const updatedCamp = await campService.update(id, updates);
      setCamps(camps.map(c => c.id === id ? updatedCamp : c));
      return updatedCamp;
    } catch (err) {
      console.error('Error updating camp:', err);
      throw err;
    }
  };

  const deleteCamp = async (id: string) => {
    try {
      await campService.delete(id);
      setCamps(camps.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting camp:', err);
      throw err;
    }
  };

  return {
    camps,
    loading,
    error,
    refetch: fetchCamps,
    createCamp,
    updateCamp,
    deleteCamp,
  };
}

export function useCamp(id: string) {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCamp = async () => {
      try {
        setLoading(true);
        const data = await campService.getById(id);
        setCamp(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching camp:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCamp();
    }
  }, [id]);

  return { camp, loading, error };
}
