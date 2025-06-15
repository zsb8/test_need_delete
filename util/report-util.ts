export const queryReportData = async (
  startYear: number,
  endYear: number,
  teamName: string,
  kpiName: string
) => {
  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startYear,
        endYear,
        teamName,
        kpiName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying report data:', error);
    throw error;
  }
}; 