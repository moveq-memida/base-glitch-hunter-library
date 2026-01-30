const DISCORD_WEBHOOK_NEW_GLITCH = process.env.DISCORD_WEBHOOK_NEW_GLITCH;
const DISCORD_WEBHOOK_STAMPS = process.env.DISCORD_WEBHOOK_STAMPS;

interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: {
    url: string;
  };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

async function sendWebhook(webhookUrl: string, message: DiscordMessage): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

export async function notifyNewGlitch(glitch: {
  id: number;
  title: string;
  gameName: string;
  platform: string;
  authorAddress: string;
  videoUrl?: string | null;
  description: string;
}): Promise<boolean> {
  if (!DISCORD_WEBHOOK_NEW_GLITCH) {
    console.warn('DISCORD_WEBHOOK_NEW_GLITCH not configured');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz';
  const glitchUrl = `${baseUrl}/glitch/${glitch.id}`;

  // Extract YouTube thumbnail if available
  let thumbnailUrl: string | undefined;
  if (glitch.videoUrl) {
    const match = glitch.videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    if (match && match[1]) {
      thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  const message: DiscordMessage = {
    embeds: [
      {
        title: `New Glitch: ${glitch.title}`,
        description: glitch.description.slice(0, 200) + (glitch.description.length > 200 ? '...' : ''),
        url: glitchUrl,
        color: 0x8b5cf6, // Purple accent color
        fields: [
          {
            name: 'Game',
            value: glitch.gameName,
            inline: true,
          },
          {
            name: 'Platform',
            value: glitch.platform,
            inline: true,
          },
          {
            name: 'Hunter',
            value: `${glitch.authorAddress.slice(0, 6)}...${glitch.authorAddress.slice(-4)}`,
            inline: true,
          },
        ],
        ...(thumbnailUrl && { thumbnail: { url: thumbnailUrl } }),
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendWebhook(DISCORD_WEBHOOK_NEW_GLITCH, message);
}

export async function notifyStamp(glitch: {
  id: number;
  title: string;
  gameName: string;
  txHash: string;
  stamperAddress: string;
}): Promise<boolean> {
  if (!DISCORD_WEBHOOK_STAMPS) {
    console.warn('DISCORD_WEBHOOK_STAMPS not configured');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz';
  const glitchUrl = `${baseUrl}/glitch/${glitch.id}`;
  const txUrl = `https://basescan.org/tx/${glitch.txHash}`;

  const message: DiscordMessage = {
    embeds: [
      {
        title: `Stamped: ${glitch.title}`,
        description: `A glitch has been stamped on Base!`,
        url: glitchUrl,
        color: 0x22c55e, // Green success color
        fields: [
          {
            name: 'Game',
            value: glitch.gameName,
            inline: true,
          },
          {
            name: 'Stamped by',
            value: `${glitch.stamperAddress.slice(0, 6)}...${glitch.stamperAddress.slice(-4)}`,
            inline: true,
          },
          {
            name: 'Transaction',
            value: `[View on BaseScan](${txUrl})`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendWebhook(DISCORD_WEBHOOK_STAMPS, message);
}

export async function notifyContestStart(contest: {
  id: number;
  title: string;
  description: string;
  endDate: Date;
  prizeDescription?: string | null;
}): Promise<boolean> {
  if (!DISCORD_WEBHOOK_NEW_GLITCH) {
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://memida.xyz';
  const contestUrl = `${baseUrl}/contests/${contest.id}`;

  const message: DiscordMessage = {
    content: '@everyone New Contest Started!',
    embeds: [
      {
        title: contest.title,
        description: contest.description.slice(0, 500),
        url: contestUrl,
        color: 0xfbbf24, // Gold color
        fields: [
          {
            name: 'Ends',
            value: contest.endDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            inline: true,
          },
          ...(contest.prizeDescription
            ? [
                {
                  name: 'Prizes',
                  value: contest.prizeDescription.slice(0, 200),
                  inline: false,
                },
              ]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendWebhook(DISCORD_WEBHOOK_NEW_GLITCH, message);
}
