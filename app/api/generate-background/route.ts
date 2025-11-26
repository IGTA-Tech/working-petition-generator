import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const dynamic = 'force-dynamic';

interface GenerateBackgroundRequest {
  fullName: string;
  jobTitle: string;
  fieldOfProfession: string;
  urls: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateBackgroundRequest = await request.json();
    const { fullName, jobTitle, fieldOfProfession, urls } = body;

    if (!fullName || !fieldOfProfession) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName and fieldOfProfession' },
        { status: 400 }
      );
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'No URLs provided. Please use the beneficiary lookup first or add URLs manually.' },
        { status: 400 }
      );
    }

    // Use Claude to analyze the URLs and generate a comprehensive background
    const prompt = `You are an immigration attorney assistant helping to draft detailed career background information for a visa petition.

**Beneficiary:** ${fullName}
**Job Title/Field:** ${jobTitle || fieldOfProfession}
**Field of Profession:** ${fieldOfProfession}

**Evidence URLs found:**
${urls.slice(0, 15).map((url, i) => `${i + 1}. ${url}`).join('\n')}

Your task: Based on these URLs (you can infer what they likely contain based on the domain and URL structure), generate a comprehensive career background narrative (300-500 words) that includes:

1. **Career History & Timeline** - When they started, major milestones, career progression
2. **Major Achievements** - Specific accomplishments, rankings, competitions won, records set
3. **Training & Education** - Where they trained, with whom, notable coaches or institutions
4. **Awards & Recognition** - Titles, prizes, honors received
5. **Current Activities** - What they're doing now, recent work
6. **Notable Work** - Specific projects, competitions, performances, publications
7. **Quantifiable Metrics** - Numbers, rankings, statistics that demonstrate excellence
8. **US Plans** - Why they want to come to the US (infer based on field and achievements)

**IMPORTANT INSTRUCTIONS:**
- Be SPECIFIC with dates, numbers, rankings, and names
- Use phrases like "has competed in," "ranked #X," "won Y championships," "trained at Z"
- Make it sound like it was written by the beneficiary or their representative
- Focus on FACTS and ACHIEVEMENTS, not speculation
- If the URLs suggest high-level achievement (UFC, Olympics, major publications), emphasize that
- Write in 3rd person (e.g., "John Smith is a...")
- Aim for 300-500 words
- Make it detailed enough to satisfy immigration requirements

Return ONLY the background narrative text, no extra formatting or explanations.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the generated background
    const generatedBackground = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!generatedBackground || generatedBackground.length < 100) {
      return NextResponse.json(
        { error: 'Failed to generate sufficient background information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      background: generatedBackground,
      wordCount: generatedBackground.split(/\s+/).length,
      charCount: generatedBackground.length,
    });
  } catch (error) {
    console.error('Error in background generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate background information' },
      { status: 500 }
    );
  }
}
