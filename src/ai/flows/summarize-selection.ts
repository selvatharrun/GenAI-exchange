'use server';

/**
 * @fileOverview Provides functionality to summarize selected text from a PDF document.
 *
 * - summarizeSelection - A function that accepts selected text and returns a summary.
 * - SummarizeSelectionInput - The input type for the summarizeSelection function, including the selected text.
 * - SummarizeSelectionOutput - The return type for the summarizeSelection function, which is the summary of the text.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSelectionInputSchema = z.object({
  selectedText: z
    .string()
    .describe('The text selected by the user to be summarized.'),
});
export type SummarizeSelectionInput = z.infer<typeof SummarizeSelectionInputSchema>;

const SummarizeSelectionOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the selected text.'),
});
export type SummarizeSelectionOutput = z.infer<typeof SummarizeSelectionOutputSchema>;

export async function summarizeSelection(input: SummarizeSelectionInput): Promise<SummarizeSelectionOutput> {
  return summarizeSelectionFlow(input);
}

const summarizeSelectionPrompt = ai.definePrompt({
  name: 'summarizeSelectionPrompt',
  input: {schema: SummarizeSelectionInputSchema},
  output: {schema: SummarizeSelectionOutputSchema},
  prompt: `Summarize the following text:

{{{selectedText}}}`, // Handlebars syntax is correctly used here.
});

const summarizeSelectionFlow = ai.defineFlow(
  {
    name: 'summarizeSelectionFlow',
    inputSchema: SummarizeSelectionInputSchema,
    outputSchema: SummarizeSelectionOutputSchema,
  },
  async input => {
    const {output} = await summarizeSelectionPrompt(input);
    return output!;
  }
);
