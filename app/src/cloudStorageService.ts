const API_BASE_URL = '/api/data';

export const saveToCloud = async (stocks: any[]): Promise<void> => {
  try {
    console.log('Saving data to cloud...', { stockCount: stocks.length });
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: stocks }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Cloud save successful:', result);
    return result;
  } catch (error) {
    console.error('Error saving to cloud:', error);
    throw error;
  }
};

export const loadFromCloud = async (): Promise<any[]> => {
  try {
    console.log('Loading data from cloud...');
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Cloud load successful:', { count: result.data?.length || 0 });
    return result.data || [];
  } catch (error) {
    console.error('Error loading from cloud:', error);
    throw error;
  }
};