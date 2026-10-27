import { z } from 'zod';

export const weatherOutputSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  summary: z.string(),
});