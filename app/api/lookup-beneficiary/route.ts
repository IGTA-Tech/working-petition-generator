import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const dynamic = 'force-dynamic';

interface LookupRequest {
  fullName: string;
  jobTitle: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LookupRequest = await request.json();
    const { fullName, jobTitle } = body;

    if (!fullName || !jobTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName and jobTitle' },
        { status: 400 }
      );
    }

    // Use Claude to search for relevant URLs about the beneficiary
    const prompt = `You are a research assistant helping to find credible online evidence about a person's professional achievements.

**Beneficiary:** ${fullName}
**Job Title/Field:** ${jobTitle}

Your task: Find approximately 15 high-quality URLs that provide evidence of this person's achievements, recognition, and professional standing.

**Search for:**
- News articles and media coverage
- Official competition results or rankings
- Academic publications or research profiles
- Professional organization profiles
- Award announcements
- Industry recognition
- Wikipedia or encyclopedia entries
- Interviews or profiles

**Requirements:**
1. Return ONLY valid URLs (must start with http:// or https://)
2. Prioritize credible sources (major news outlets, official organizations, academic sites)
3. Look for URLs that match BOTH the name AND the job title/field
4. Aim for 10-15 URLs (return fewer if you can't find high-quality matches)
5. If you find nothing credible, return an empty list

**Output format:**
Return a JSON object with a single field "urls" containing an array of URL strings.

Example:
{
  "urls": [
    "https://www.espn.com/article-about-person",
    "https://en.wikipedia.org/wiki/PersonName",
    "https://olympics.com/results/person"
  ]
}

**IMPORTANT:** If you cannot find any credible information about this person, return {"urls": []}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Try to extract JSON from the response
    let urls: string[] = [];
    try {
      // Look for JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*"urls"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        urls = parsed.urls || [];
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      // If parsing fails, try to extract URLs directly using regex
      const urlRegex = /https?:\/\/[^\s"',\]]+/gi;
      const matches = responseText.match(urlRegex);
      urls = matches || [];
    }

    // Validate and clean URLs
    const validUrls: string[] = [];
    for (const url of urls) {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Skip invalid URLs
      }
    }

    // Limit to 15 URLs
    const limitedUrls = validUrls.slice(0, 15);

    return NextResponse.json({
      success: true,
      urls: limitedUrls,
      count: limitedUrls.length,
    });
  } catch (error) {
    console.error('Error in beneficiary lookup:', error);
    return NextResponse.json(
      { error: 'Failed to lookup beneficiary information' },
      { status: 500 }
    );
  }
}
