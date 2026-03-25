import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const episodes = (await getCollection('podcast', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Games as a Podcast',
    description: 'Jabbering about games and the industry that makes them.',
    site: context.site!,
    xmlns: {
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    customData: `
      <language>en-us</language>
      <itunes:author>xispo</itunes:author>
      <itunes:category text="Games &amp; Hobbies" />
      <itunes:explicit>no</itunes:explicit>
      <itunes:image href="${context.site}podcast/artwork.jpg" />
      <itunes:new-feed-url>${context.site}podcast/rss.xml</itunes:new-feed-url>
    `,
    items: episodes.map(ep => ({
      title: ep.data.title,
      pubDate: ep.data.date,
      description: ep.data.description,
      link: `/podcast/${ep.id}`,
      customData: [
        ep.data.episodeNumber != null ? `<itunes:episode>${ep.data.episodeNumber}</itunes:episode>` : '',
        ep.data.season      != null ? `<itunes:season>${ep.data.season}</itunes:season>`           : '',
        ep.data.duration               ? `<itunes:duration>${ep.data.duration}</itunes:duration>`           : '',
        ep.data.artwork                ? `<itunes:image href="${ep.data.artwork}" />`                        : '',
        `<itunes:explicit>no</itunes:explicit>`,
        ep.data.audioUrl && ep.data.fileSize
          ? `<enclosure url="${ep.data.audioUrl}" length="${ep.data.fileSize}" type="audio/mpeg" />`
          : ep.data.audioUrl
            ? `<enclosure url="${ep.data.audioUrl}" length="0" type="audio/mpeg" />`
            : '',
      ].filter(Boolean).join('\n'),
    })),
  });
}
