import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },

  collections: {
    journal: collection({
      label: 'Journal',
      slugField: 'title',
      path: 'src/content/journal/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        categories: fields.array(
          fields.text({ label: 'Category' }),
          { label: 'Categories', itemLabel: props => props.value }
        ),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          { label: 'Tags', itemLabel: props => props.value }
        ),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        body: fields.mdx({ label: 'Body' }),
      },
    }),

    podcast: collection({
      label: 'Podcast Episodes',
      slugField: 'title',
      path: 'src/content/podcast/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Publish Date' }),
        episodeNumber: fields.integer({ label: 'Episode Number' }),
        season: fields.integer({ label: 'Season' }),
        audioUrl: fields.url({ label: 'Audio URL', description: 'Full URL to the MP3 on R2 or your host' }),
        duration: fields.text({ label: 'Duration', description: 'e.g. 1:23:45' }),
        fileSize: fields.integer({ label: 'File Size (bytes)', description: 'Used in RSS enclosure tag' }),
        description: fields.text({ label: 'Description', multiline: true }),
        artwork: fields.url({ label: 'Episode Artwork URL' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        body: fields.mdx({ label: 'Show Notes' }),
      },
    }),
  },
});
