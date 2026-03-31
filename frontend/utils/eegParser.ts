import { EEGSession } from '@/lib/types';

export function parseEEGFile(json: string): EEGSession {
  const data = JSON.parse(json);
  if (!data.session_id || !data.data || !data.sample_rate) {
    throw new Error('Invalid EEG format: missing required fields');
  }
  return data as EEGSession;
}

export function getChannelNames(session: EEGSession): string[] {
  return Object.keys(session.data);
}

export function getTimeAxis(session: EEGSession): number[] {
  const numSamples = session.data.ch1?.length || 0;
  return Array.from({ length: numSamples }, (_, i) => i / session.sample_rate);
}

export function downsample(arr: number[], factor: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i += factor) {
    result.push(arr[i]);
  }
  return result;
}

export function prepareChartData(session: EEGSession, channelKeys: string[], maxPoints = 500) {
  const sampleCount = session.data[channelKeys[0]]?.length || 0;
  const factor = Math.max(1, Math.floor(sampleCount / maxPoints));

  const chartData: Record<string, number>[] = [];
  for (let i = 0; i < sampleCount; i += factor) {
    const point: Record<string, number> = { time: parseFloat((i / session.sample_rate).toFixed(3)) };
    channelKeys.forEach(ch => {
      point[ch] = parseFloat((session.data[ch]?.[i] || 0).toFixed(4));
    });
    chartData.push(point);
  }
  return chartData;
}
